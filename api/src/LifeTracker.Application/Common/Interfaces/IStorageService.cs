namespace LifeTracker.Application.Common.Interfaces;

public interface IStorageService
{
    Task<string> UploadFileAsync(
        Guid userId,
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default);

    Task<string> GetDownloadUrlAsync(
        string fileKey,
        CancellationToken cancellationToken = default);
}
