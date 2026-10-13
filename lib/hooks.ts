"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApiError } from "./api";
import type { Page } from "./types";

export function errorText(e: unknown): string {
  if (e instanceof ApiError) return e.detail;
  if (e instanceof Error) return e.message;
  return "Error inesperado";
}

/**
 * Carga asíncrona con estado de carga/error y recarga manual.
 * `deps` se compara por valor (JSON), así que admite primitivos y objetos planos.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const key = JSON.stringify(deps);
  const [tick, setTick] = useState(0);
  const req = `${key}#${tick}`;
  const [state, setState] = useState<{ req: string | null; data: T | null; error: string | null }>({
    req: null,
    data: null,
    error: null,
  });

  const fnRef = useRef(fn);
  useLayoutEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => {
    let cancelado = false;
    fnRef
      .current()
      .then((data) => !cancelado && setState({ req, data, error: null }))
      .catch((e) => !cancelado && setState((s) => ({ req, data: s.data, error: errorText(e) })));
    return () => {
      cancelado = true;
    };
  }, [req]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((data: T) => setState((s) => ({ ...s, data })), []);

  return { data: state.data, error: state.error, loading: state.req !== req, reload, setData };
}

/** Paginación del lado del servidor. */
export function usePaged<T>(fn: (page: number, size: number) => Promise<Page<T>>, deps: unknown[], initialSize = 10) {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialSize);
  // Al cambiar los filtros se vuelve a la primera página.
  const depsKey = JSON.stringify(deps);
  const [lastKey, setLastKey] = useState(depsKey);
  if (lastKey !== depsKey) {
    setLastKey(depsKey);
    setPage(0);
  }
  const state = useAsync(() => fn(page, size), [page, size, depsKey]);
  return { ...state, page, size, setPage, setSize };
}

const NUNCA = Symbol("nunca");

/**
 * Ejecuta `fn` durante el render cuando `trigger` cambia a un valor verdadero
 * (p. ej. al abrir un diálogo), para reiniciar el estado de un formulario sin efectos.
 */
export function useOnOpen(trigger: unknown, fn: () => void) {
  const [prev, setPrev] = useState<unknown>(NUNCA);
  if (trigger !== prev) {
    setPrev(trigger);
    if (trigger) fn();
  }
}
