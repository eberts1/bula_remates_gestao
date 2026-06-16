export class FetchJsonError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'FetchJsonError';
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json();

  if (!res.ok) {
    const message =
      typeof data.message === 'string'
        ? data.message
        : 'Erro na requisição';
    throw new FetchJsonError(message, res.status);
  }

  return data as T;
}
