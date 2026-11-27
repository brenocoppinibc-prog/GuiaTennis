// O relógio da nota fiscal automática (regra 331): a cada 20 minutos, emite as
// notas que estão na fila e cancela as dos estornos (para quando o aviso do
// Mercado Pago não chegou ou a Prefeitura estava fora do ar). A Netlify só roda
// o relógio no site de verdade; na prévia, o admin usa "Processar a fila".
import { processarFila } from "./nota-fiscal.mjs";

export default async () => {
  try { await processarFila(); } catch (e) { console.error("nota-fiscal-relogio:", e && e.message); }
  return new Response("ok");
};
export const config = { schedule: "*/20 * * * *" };
