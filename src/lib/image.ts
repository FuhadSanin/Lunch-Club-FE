// Turns a picture the person chose into a small one that is kept with the menu itself (a data URL), so there is
// nothing else to host. The longest side shrinks to `maxSide`, and the quality drops until it fits `maxChars`.

const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export async function smallPicture(file: File, maxSide: number, maxChars: number): Promise<string> {
  if (!TYPES.includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP picture.');
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("Couldn't read that picture. Try another one.");
  });
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error("Couldn't prepare that picture.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.82, 0.7, 0.58, 0.46, 0.34]) {
    const url = canvas.toDataURL('image/webp', quality);
    if (url.length <= maxChars) return url;
  }
  throw new Error('That picture is too detailed. Try a smaller one.');
}

// What the API accepts for a picture: sizes in characters (see local_menus.py in the API).
export const RESTAURANT_PICTURE = { side: 480, chars: 70_000 };
export const DISH_PICTURE = { side: 160, chars: 25_000 };
