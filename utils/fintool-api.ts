const FINTOOL_HOST = process.env.FINTOOL_HOST!;
const FINTOOL_API_KEY = process.env.FINTOOL_API_KEY!;

type RequestOptions = {
  path: string;
  body?: BodyInit | ReadableStream<Uint8Array> | string | null | undefined;
  method?: string;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export async function doRequest({ method, path, body, headers, signal }: RequestOptions): Promise<Response> {
  const url = `${FINTOOL_HOST}/${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${FINTOOL_API_KEY}`,
      ...headers,
    },
    body,
    signal,
  });
  return resp;
}
