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

    private IAmazonS3 GetClient()
    {
        if (_s3Client != null) return _s3Client;

        var accountId = _configuration["CloudflareR2:AccountId"] ?? Environment.GetEnvironmentVariable("R2_ACCOUNT_ID");
        var accessKey = _configuration["CloudflareR2:AccessKeyId"] ?? Environment.GetEnvironmentVariable("R2_ACCESS_KEY_ID");
        var secretKey = _configuration["CloudflareR2:SecretAccessKey"] ?? Environment.GetEnvironmentVariable("R2_SECRET_ACCESS_KEY");

        if (string.IsNullOrWhiteSpace(accountId) || string.IsNullOrWhiteSpace(accessKey) || string.IsNullOrWhiteSpace(secretKey))
        {
            _logger.LogWarning("Credenciales de Cloudflare R2 no configuradas. Operando en modo local/stub.");
        }

        var credentials = new BasicAWSCredentials(accessKey ?? "stub", secretKey ?? "stub");
        var config = new AmazonS3Config
        {
            ServiceURL = $"https://{accountId ?? "stub"}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto",
            ForcePathStyle = true
        };

        _s3Client = new AmazonS3Client(credentials, config);
        return _s3Client;
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

        try
        {
            var client = GetClient();
            var putRequest = new PutObjectRequest
            {
                BucketName = bucket,
                Key = fileKey,
                InputStream = fileStream,
                ContentType = contentType,
                DisablePayloadSigning = true
            };

            await client.PutObjectAsync(putRequest, cancellationToken);
            _logger.LogInformation("Archivo subido exitosamente a Cloudflare R2 con clave {Key}", fileKey);

            var customDomain = _configuration["CloudflareR2:PublicCustomDomain"] 
                               ?? Environment.GetEnvironmentVariable("R2_PUBLIC_CUSTOM_DOMAIN");

            return string.IsNullOrWhiteSpace(customDomain) 
                ? fileKey 
                : $"{customDomain.TrimEnd('/')}/{fileKey}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error al subir archivo a Cloudflare R2. Se retorna la clave lógica {Key}", fileKey);
            return fileKey;
        }
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
}
