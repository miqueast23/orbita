"use client";

// Eventos globales simples entre componentes cliente (toast y compositor).
export const toast = (msg: string) => window.dispatchEvent(new CustomEvent("orbita:toast", { detail: msg }));
export const openComposer = (space = "") => window.dispatchEvent(new CustomEvent("orbita:compose", { detail: space }));
