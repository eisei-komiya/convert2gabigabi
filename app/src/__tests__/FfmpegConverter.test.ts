import { convertImage } from '../data/ffmpeg/FfmpegConverter';

const mockExecute = jest.fn();
const mockIsSuccess = jest.fn();
const mockExtractErrorFromLogs = jest.fn();
const mockDeleteAsync = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  ReturnCode: {
    isSuccess: (...args: unknown[]) => mockIsSuccess(...args),
  },
}));

jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: 'file:///cache/' },
  },
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: (...args: unknown[]) => mockExtractErrorFromLogs(...args),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
}));

describe('FfmpegConverter GIF conversion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteAsync.mockResolvedValue(undefined);
    mockExtractErrorFromLogs.mockResolvedValue('ffmpeg error logs');
  });

  it('runs GIF conversion using palettegen + paletteuse 2-pass flow', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2048 })
      .mockResolvedValueOnce({ exists: true, size: 1024 });

    const session1 = { getReturnCode: jest.fn().mockResolvedValue('ok1') };
    const session2 = { getReturnCode: jest.fn().mockResolvedValue('ok2') };
    mockExecute.mockResolvedValueOnce(session1).mockResolvedValueOnce(session2);
    mockIsSuccess.mockReturnValue(true);

    const result = await convertImage('file:///input/anim.mp4', { outputFormat: 'gif' });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[0][0]).toContain('palettegen');
    expect(mockExecute.mock.calls[1][0]).toContain('paletteuse');
    expect(result.outputUri).toContain('anim_converted_12345_abc.gif');
    expect(result.outputBytes).toBe(1024);
  });

  it('cleans up palette file even when pass1 fails', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 2048 });

    const session1 = { getReturnCode: jest.fn().mockResolvedValue('ng1') };
    mockExecute.mockResolvedValueOnce(session1);
    mockIsSuccess.mockReturnValue(false);

    await expect(convertImage('file:///input/anim.mp4', { outputFormat: 'gif' })).rejects.toThrow(
      'GIF パレット生成に失敗しました',
    );

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///cache/anim_converted_12345_abc.gif.palette.png',
      { idempotent: true },
    );
  });

  it('cleans up palette file after successful GIF conversion', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2048 })
      .mockResolvedValueOnce({ exists: true, size: 512 });

    const session1 = { getReturnCode: jest.fn().mockResolvedValue('ok1') };
    const session2 = { getReturnCode: jest.fn().mockResolvedValue('ok2') };
    mockExecute.mockResolvedValueOnce(session1).mockResolvedValueOnce(session2);
    mockIsSuccess.mockReturnValue(true);

    await convertImage('file:///input/anim.mp4', { outputFormat: 'gif' });

    expect(mockDeleteAsync).toHaveBeenCalledWith(
      'file:///cache/anim_converted_12345_abc.gif.palette.png',
      { idempotent: true },
    );
  });
});
