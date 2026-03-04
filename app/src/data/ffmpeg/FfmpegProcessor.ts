import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';

export interface FfmpegProcessResult {
  outputUri: string;
  outputBytes: number;
}

/**
 * ガビガビレベルに対応するJPEG品質値（FFmpeg -q:v, 1=最高品質, 31=最低品質）
 */
const GABIGABI_QUALITY: Record<number, number> = {
  1: 12, // 軽微
  2: 18, // 普通
  3: 23, // 重め
  4: 27, // 極重
  5: 31, // 破壊レベル
};

/**
 * アプリのキャッシュディレクトリパスを取得する。
 * 新API (Paths.cache) を使用。
 */
function getCacheDir(): string {
  const dir = Paths.cache.uri;
  // uri は "file:///data/..." 形式
  return dir.endsWith('/') ? dir : dir + '/';
}

/**
 * FFmpegを使って画像をガビガビ化する。
 * スケール縮小 + 低品質JPEG圧縮でガビガビ効果を出す。
 *
 * @param inputUri   入力画像のファイルURI
 * @param scalePct   縮小率（1〜100 %）
 * @param gabigabiLevel  ガビガビレベル（1〜5、省略時 2）
 */
export async function processWithFfmpeg(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
): Promise<FfmpegProcessResult> {
  if (scalePct <= 0 || scalePct > 100) {
    throw new Error('scalePct must be within (0, 100]');
  }
  if (gabigabiLevel < 1 || gabigabiLevel > 5) {
    throw new Error('gabigabiLevel must be 1-5');
  }

  const inputPath = inputUri.replace('file://', '');
  const fileName = inputPath.split('/').pop() ?? 'image.jpg';
  const stem = fileName.replace(/\.[^.]+$/, '');
  const ext = fileName.match(/\.[^.]+$/)?.[0] ?? '.jpg';
  const cacheDir = getCacheDir();
  const suffix = Date.now();
  const outputUri = `${cacheDir}${stem}_gabigabi_${suffix}${ext}`;
  const outputPath = outputUri.replace('file://', '');

  console.log('[FFmpeg] outputPath:', outputPath);

  const quality = GABIGABI_QUALITY[gabigabiLevel] ?? 18;
  const scale = scalePct / 100;

  // -vf scale でリサイズ、-q:v でJPEG品質を下げてガビガビ化
  // -update 1 -frames:v 1: image2 muxer で単一画像出力に必要
  const cmd = [
    '-y',
    '-i', `"${inputPath}"`,
    '-vf', `"scale=iw*${scale}:ih*${scale}"`,
    '-q:v', String(quality),
    '-update', '1',
    '-frames:v', '1',
    `"${outputPath}"`,
  ].join(' ');

  const session = await FFmpegKit.execute(cmd);
  const rc = await session.getReturnCode();

  if (!ReturnCode.isSuccess(rc)) {
    const logs = await session.getAllLogsAsString();
    throw new Error(`FFmpeg処理に失敗しました: ${logs}`);
  }

  const info = await FileSystem.getInfoAsync(outputUri, { size: true });
  if (!info.exists) {
    throw new Error('FFmpeg出力ファイルが見つかりません');
  }
  return {
    outputUri,
    outputBytes: (info as FileSystem.FileInfo & { size: number }).size ?? 0,
  };
}
