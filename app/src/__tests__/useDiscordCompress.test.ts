import { compressForDiscord, compressToTargetSize } from '../domain/useDiscordCompress';
import {
  compressForDiscord as ffmpegCompressForDiscord,
  compressToTargetSize as ffmpegCompressToTargetSize,
} from '../data/ffmpeg/FfmpegCompressor';

jest.mock('../data/ffmpeg/FfmpegCompressor', () => ({
  compressForDiscord: jest.fn(),
  compressToTargetSize: jest.fn(),
}));

const mockCompressForDiscord = ffmpegCompressForDiscord as jest.MockedFunction<
  typeof ffmpegCompressForDiscord
>;
const mockCompressToTargetSize = ffmpegCompressToTargetSize as jest.MockedFunction<
  typeof ffmpegCompressToTargetSize
>;

describe('useDiscordCompress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('compressForDiscord delegates to ffmpeg compressor with default video format', async () => {
    mockCompressForDiscord.mockResolvedValue({
      outputUri: 'file:///cache/out.mp4',
      outputBytes: 1024,
      compressionRatio: 0.5,
    });

    const result = await compressForDiscord('file:///input.mov');

    expect(mockCompressForDiscord).toHaveBeenCalledWith('file:///input.mov', 'mp4');
    expect(result).toEqual({
      outputUri: 'file:///cache/out.mp4',
      outputBytes: 1024,
      compressionRatio: 0.5,
    });
  });

  it('compressForDiscord accepts an explicit video format', async () => {
    mockCompressForDiscord.mockResolvedValue({
      outputUri: 'file:///cache/out.webm',
      outputBytes: 777,
      compressionRatio: 0.3,
    });

    await compressForDiscord('file:///input.mov', 'webm');

    expect(mockCompressForDiscord).toHaveBeenCalledWith('file:///input.mov', 'webm');
  });

  it('compressToTargetSize delegates with default video format', async () => {
    mockCompressToTargetSize.mockResolvedValue({
      outputUri: 'file:///cache/out.mp4',
      outputBytes: 999,
      compressionRatio: 0.8,
    });

    const result = await compressToTargetSize('file:///input.mov', 10 * 1024 * 1024);

    expect(mockCompressToTargetSize).toHaveBeenCalledWith(
      'file:///input.mov',
      10 * 1024 * 1024,
      'mp4',
    );
    expect(result.outputBytes).toBe(999);
  });

  it('compressToTargetSize propagates errors', async () => {
    mockCompressToTargetSize.mockRejectedValue(new Error('compress failed'));

    await expect(compressToTargetSize('file:///input.mov', 1024, 'mp4')).rejects.toThrow(
      'compress failed',
    );
  });
});
