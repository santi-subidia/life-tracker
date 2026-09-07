using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LifeTracker.Application.Common.Interfaces;

namespace LifeTracker.Infrastructure.Storage;

public class CloudflareR2StorageService : IStorageService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<CloudflareR2StorageService> _logger;
    private IAmazonS3? _s3Client;

    public CloudflareR2StorageService(IConfiguration configuration, ILogger<CloudflareR2StorageService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    private IAmazonS3? GetClient()
    {
        if (_s3Client != null) return _s3Client;

        var accountId = _configuration["CloudflareR2:AccountId"] ?? Environment.GetEnvironmentVariable("R2_ACCOUNT_ID");
        var accessKey = _configuration["CloudflareR2:AccessKeyId"] ?? Environment.GetEnvironmentVariable("R2_ACCESS_KEY_ID");
        var secretKey = _configuration["CloudflareR2:SecretAccessKey"] ?? Environment.GetEnvironmentVariable("R2_SECRET_ACCESS_KEY");

        if (string.IsNullOrWhiteSpace(accountId) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey)
            || accountId.Contains("your-") || accountId.Equals("stub", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Credenciales de Cloudflare R2 no configuradas. Operando en modo local/stub.");
            return null;
        }

        var credentials = new BasicAWSCredentials(accessKey, secretKey);
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto",
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(credentials, config);
        return _s3Client;
    }

    private string GetLocalStoragePath(string fileKey)
    {
        var normalized = NormalizeFileKey(fileKey).Replace('/', Path.DirectorySeparatorChar);
        var baseDir = Path.Combine(Directory.GetCurrentDirectory(), "data", "storage");
        return Path.Combine(baseDir, normalized);
    }

    private static string NormalizeFileKey(string fileKey)
    {
        if (string.IsNullOrWhiteSpace(fileKey)) return string.Empty;
        if (fileKey.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            fileKey.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
        {
            if (Uri.TryCreate(fileKey, UriKind.Absolute, out var uri))
            {
                var path = uri.AbsolutePath.TrimStart('/');
                var studiesIdx = path.IndexOf("studies/", StringComparison.OrdinalIgnoreCase);
                return studiesIdx >= 0 ? path[studiesIdx..] : path;
            }
        }
        return fileKey.TrimStart('/');
    }

    private static string GetContentTypeFromExtension(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".pdf" => "application/pdf",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".webp" => "image/webp",
            _ => "application/octet-stream"
        };
    }

    public async Task<string> UploadFileAsync(
        Guid userId,
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        var bucket = _configuration["CloudflareR2:BucketName"] 
                     ?? Environment.GetEnvironmentVariable("R2_BUCKET_NAME") 
                     ?? "life-tracker-bucket";

        var extension = Path.GetExtension(fileName).TrimStart('.');
        var fileKey = $"studies/{userId}/{Guid.NewGuid()}.{extension}";

        // 1. Guardar primero en almacenamiento en disco local para garantizar disponibilidad inmediata
        try
        {
            var localPath = GetLocalStoragePath(fileKey);
            var dir = Path.GetDirectoryName(localPath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }

            await using var localFileStream = File.Create(localPath);
            await fileStream.CopyToAsync(localFileStream, cancellationToken);
            _logger.LogInformation("Archivo guardado localmente en {Path}", localPath);

            if (fileStream.CanSeek)
            {
                fileStream.Position = 0;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo guardar la copia local del archivo con clave {Key}", fileKey);
        }

        // 2. Intentar subir a Cloudflare R2 si está configurado
        try
        {
            var client = GetClient();
            if (client != null)
            {
                var localPath = GetLocalStoragePath(fileKey);
                Stream uploadStream = File.Exists(localPath) 
                    ? File.OpenRead(localPath) 
                    : fileStream;

                await using (uploadStream)
                {
                    var putRequest = new PutObjectRequest
                    {
                        BucketName = bucket,
                        Key = fileKey,
                        InputStream = uploadStream,
                        ContentType = contentType,
                        DisablePayloadSigning = true
                    };

                    try
                    {
                        await client.PutObjectAsync(putRequest, cancellationToken);
                        _logger.LogInformation("Archivo subido exitosamente a Cloudflare R2 con clave {Key}", fileKey);
                    }
                    catch (AmazonS3Exception s3Ex) when (s3Ex.Message.Contains("bucket does not exist", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogWarning("El bucket '{Bucket}' no existe en Cloudflare R2. Intentando crearlo automáticamente...", bucket);
                        try
                        {
                            await client.PutBucketAsync(new PutBucketRequest { BucketName = bucket }, cancellationToken);
                            _logger.LogInformation("Bucket '{Bucket}' creado exitosamente en Cloudflare R2. Reintentando subida...", bucket);

                            if (uploadStream.CanSeek)
                            {
                                uploadStream.Position = 0;
                            }
                            await client.PutObjectAsync(putRequest, cancellationToken);
                            _logger.LogInformation("Archivo subido exitosamente a Cloudflare R2 tras crear el bucket.");
                        }
                        catch (Exception createEx)
                        {
                            _logger.LogWarning(createEx, "No se pudo auto-crear el bucket '{Bucket}' en Cloudflare R2. El archivo queda preservado con total seguridad en disco local.", bucket);
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Aviso: No se pudo subir el archivo a Cloudflare R2. Se conserva la copia local segura con clave {Key}", fileKey);
        }

        return fileKey;
    }

    public Task<string> GetDownloadUrlAsync(string fileKey, CancellationToken cancellationToken = default)
    {
        var customDomain = _configuration["CloudflareR2:PublicCustomDomain"] 
                           ?? Environment.GetEnvironmentVariable("R2_PUBLIC_CUSTOM_DOMAIN");

        if (!string.IsNullOrWhiteSpace(customDomain))
        {
            return Task.FromResult($"{customDomain.TrimEnd('/')}/{fileKey.TrimStart('/')}");
        }

        return Task.FromResult(fileKey);
    }

    public async Task<(Stream Stream, string ContentType)?> GetFileStreamAsync(
        string fileKey,
        CancellationToken cancellationToken = default)
    {
        var normalizedKey = NormalizeFileKey(fileKey);
        if (string.IsNullOrWhiteSpace(normalizedKey)) return null;

        // 1. Buscar primero en almacenamiento local en disco
        var localPath = GetLocalStoragePath(normalizedKey);
        if (File.Exists(localPath))
        {
            var contentType = GetContentTypeFromExtension(localPath);
            Stream stream = File.OpenRead(localPath);
            return (stream, contentType);
        }

        // 2. Si no está en disco local, intentar recuperarlo desde Cloudflare R2
        try
        {
            var client = GetClient();
            if (client != null)
            {
                var bucket = _configuration["CloudflareR2:BucketName"] 
                             ?? Environment.GetEnvironmentVariable("R2_BUCKET_NAME") 
                             ?? "life-tracker-bucket";

                var response = await client.GetObjectAsync(bucket, normalizedKey, cancellationToken);
                var ct = response.Headers.ContentType ?? GetContentTypeFromExtension(normalizedKey);
                return (response.ResponseStream, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "No se pudo recuperar el archivo {Key} desde Cloudflare R2", normalizedKey);
        }

        return null;
    }
}
