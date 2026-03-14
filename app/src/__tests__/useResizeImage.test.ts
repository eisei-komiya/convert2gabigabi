import { resizeImage } from '../domain/useResizeImage';
import { processWithFfmpeg } from '../data/ffmpeg/FfmpegProcessor';

jest.mock('../data/ffmpeg/FfmpegProcessor', () => ({
  processWithFfmpeg: jest.fn(),
}));

const mockProcessWithFfmpeg = processWithFfmpeg as jest.MockedFunction<typeof processWithFfmpeg>;

describe('useResizeImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates to processWithFfmpeg with defaults and maps engine to ffmpeg', async () => {
    mockProcessWithFfmpeg.mockResolvedValue({
      outputUri: 'file:///cache/resized.jpg',
      outputBytes: 12345,
    });

    const result = await resizeImage('file:///input.jpg', 60);

    expect(mockProcessWithFfmpeg).toHaveBeenCalledWith('file:///input.jpg', 60, 2, {});
    expect(result).toEqual({
      outputUri: 'file:///cache/resized.jpg',
      outputBytes: 12345,
      engine: 'ffmpeg',
    });
  });

  it('passes gabigabiLevel and options through to processor', async () => {
    mockProcessWithFfmpeg.mockResolvedValue({
      outputUri: 'file:///cache/custom.jpg',
      outputBytes: 999,
    });

    const options = { enableMultiPass: true, upScaleAfterDownscale: false };
    await resizeImage('file:///input.jpg', 45, 4, options);

    expect(mockProcessWithFfmpeg).toHaveBeenCalledWith('file:///input.jpg', 45, 4, options);
  });

  it('propagates processor errors', async () => {
    mockProcessWithFfmpeg.mockRejectedValue(new Error('processor failed'));

    await expect(resizeImage('file:///input.jpg', 50)).rejects.toThrow('processor failed');
  });
});
