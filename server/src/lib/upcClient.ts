export async function lookupUpc(barcode: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`,
    )
    const data = (await res.json()) as { items?: { title: string }[] }
    return data.items?.[0]?.title ?? null
  } catch {
    return null
  }
}
