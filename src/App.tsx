import { useState } from "react";
import { dimensoes, escala, totalPerguntas } from "./questions";
import { calcular, type Resultado } from "./score";

function App() {
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);
  const [ajudaAberta, setAjudaAberta] = useState<string | null>(null);

  const respondidas = Object.keys(respostas).length;
  const progresso = Math.round((respondidas / totalPerguntas) * 100);

  function responder(chave: string, valor: number) {
    setRespostas((atuais) => ({ ...atuais, [chave]: valor }));
  }

  function enviar() {
    if (respondidas < totalPerguntas) {
      setMostrarAviso(true);
      return;
    }

    setMostrarAviso(false);
    setResultado(calcular(respostas));
    window.setTimeout(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth" }), 0);
  }

  function recomecar() {
    setRespostas({});
    setResultado(null);
    setMostrarAviso(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <header className="app-header sticky-top">
        <div className="container py-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold">Prontidão para IA</span>
          <span className="text-secondary small">{respondidas} de {totalPerguntas} · {progresso}%</span>
        </div>
        <div className="progress rounded-0" role="progressbar" aria-label="Progresso" aria-valuenow={progresso} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-bar" style={{ width: `${progresso}%` }} />
        </div>
      </header>

      <main className="container py-4 py-md-5">
        <section className="intro-card p-4 p-md-5 mb-4">
          <h1 className="h2">Sua empresa está pronta para usar inteligência artificial?</h1>
          <p className="mb-2">São 30 afirmações sobre o dia a dia do seu negócio, agrupadas em 6 temas. Marque quanto cada uma acontece hoje, sem idealizar.</p>
          <p className="text-secondary mb-0">Leva cerca de 8 minutos. Suas respostas ficam no navegador: sem cadastro, custo ou envio de dados.</p>
        </section>

        {dimensoes.map((dimensao, dimensaoIndex) => (
          <section className="mb-4" key={dimensao.id}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span className="badge text-bg-primary">{String(dimensaoIndex + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="h5 mb-0">{dimensao.nome}</h2>
                <span className="text-secondary small">{dimensao.perguntas.filter((_, i) => respostas[`${dimensao.id}-${i}`]).length} de {dimensao.perguntas.length} respondidas</span>
              </div>
            </div>

            <div className="d-grid gap-3">
              {dimensao.perguntas.map((pergunta, perguntaIndex) => {
                const chave = `${dimensao.id}-${perguntaIndex}`;
                const valor = respostas[chave];
                const faltando = mostrarAviso && !valor;

                return (
                  <article className={`question-card p-3 p-md-4 ${faltando ? "missing" : ""}`} key={chave}>
                    <div className="d-flex justify-content-between gap-3">
                      <p className="mb-0 fw-medium">{pergunta.texto}</p>
                      <button className="btn btn-sm btn-outline-secondary rounded-circle flex-shrink-0" type="button" aria-label="Ver explicação" onClick={() => setAjudaAberta(ajudaAberta === chave ? null : chave)}>?</button>
                    </div>
                    {ajudaAberta === chave && <p className="alert alert-light mt-3 mb-0 small">{pergunta.ajuda}</p>}
                    <div className="row row-cols-5 g-2 mt-2">
                      {escala.map((rotulo, indice) => {
                        const nota = indice + 1;
                        return <div className="col" key={nota}><button className={`answer-button btn w-100 ${valor === nota ? "selected" : "btn-outline-secondary"}`} type="button" title={rotulo} onClick={() => responder(chave, nota)}>{nota}</button></div>;
                      })}
                    </div>
                    <div className="d-flex justify-content-between text-secondary small mt-2"><span>{escala[0]}</span><span>{escala[4]}</span></div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {mostrarAviso && respondidas < totalPerguntas && <div className="alert alert-warning">Responda todas as afirmações para calcular sua nota. Faltam {totalPerguntas - respondidas}.</div>}
        <button className="btn btn-primary btn-lg w-100" type="button" onClick={enviar}>Calcular resultado</button>

        {resultado && <ResultadoView resultado={resultado} onRestart={recomecar} />}

        <footer className="text-secondary small border-top mt-5 pt-3 d-flex flex-wrap gap-3">
          <span>Prontidão para IA · PMEs</span><span>•</span><span>Livre e sem cadastro</span><span>•</span><span>Feito em aproximadamente 8 minutos</span>
        </footer>
      </main>
    </>
  );
}

function ResultadoView({ resultado, onRestart }: { resultado: Resultado; onRestart: () => void }) {
  return (
    <section id="resultado" className="mt-5">
      <h2 className="h4 mb-3">Resultado</h2>
      <div className="row g-3">
        <div className="col-md-auto"><div className="result-card p-4 h-100"><div className="result-score">{resultado.geral}</div><span className="text-secondary">de 100</span></div></div>
        <div className="col"><div className="result-card p-4 h-100"><h3 className="h5">{resultado.nivel.nome}</h3><p className="mb-0">{resultado.nivel.descricao}</p></div></div>
      </div>
      <div className="result-card p-4 mt-3">
        {resultado.porDimensao.map((dimensao) => <div className="mb-3" key={dimensao.id}><div className="d-flex justify-content-between small mb-1"><span>{dimensao.nome}{dimensao.critica && <span className="text-primary ms-2">(essencial)</span>}</span><span>{dimensao.nota}</span></div><div className="progress"><div className="progress-bar" style={{ width: `${dimensao.nota}%` }} /></div></div>)}
        {resultado.limitada && <p className="text-secondary small mb-0">A nota geral foi limitada pelos temas essenciais. Notas altas em outros temas não compensam uma base fraca.</p>}
      </div>
      <div className="result-card p-4 mt-3"><h3 className="h5">Caminho sugerido</h3><ul className="mb-0">{resultado.nivel.recomendacoes.map((recomendacao) => <li key={recomendacao}>{recomendacao}</li>)}</ul></div>
      <button className="btn btn-outline-primary w-100 mt-3" type="button" onClick={onRestart}>Refazer o diagnóstico</button>
    </section>
  );
}

export default App;
