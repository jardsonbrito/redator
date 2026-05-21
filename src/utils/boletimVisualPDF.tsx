import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { BoletimVisualRender } from "@/components/admin/BoletimVisualRender";
import type { AlunoBoletimDados } from "@/hooks/useAlunoBoletim";

function getNomeMes(mes: number): string {
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return nomes[mes - 1] ?? "";
}

async function carregarBase64(url: string): Promise<string | undefined> {
  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) return undefined;
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject();
      reader.readAsDataURL(blob);
    });
  } catch {
    return undefined;
  }
}

export async function exportarBoletimVisualPDF(
  dados: AlunoBoletimDados,
  mes: number,
  ano: number,
  mensagemProfessor: string
): Promise<void> {
  // Pré-carrega imagens como base64 para garantir renderização no html2canvas
  const [logoBase64, avatarBase64] = await Promise.all([
    carregarBase64("/lovable-uploads/680e47a8-eb97-4ceb-b36b-374cdf9f9c86.png"),
    dados.aluno?.avatar_url ? carregarBase64(dados.aluno.avatar_url) : Promise.resolve(undefined),
  ]);

  // Cria container fora da viewport
  const container = document.createElement("div");
  container.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1200px;background:transparent;z-index:-1;";
  document.body.appendChild(container);

  // Renderiza o componente React no container
  const root = createRoot(container);
  root.render(
    <BoletimVisualRender
      dados={dados}
      mes={mes}
      ano={ano}
      mensagemProfessor={mensagemProfessor}
      logoBase64={logoBase64}
      avatarBase64={avatarBase64}
    />
  );

  // Aguarda o React renderizar e as imagens carregarem
  await new Promise((resolve) => setTimeout(resolve, 800));

  try {
    const element = container.firstElementChild as HTMLElement;
    if (!element) throw new Error("Elemento do boletim não encontrado.");

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: null,
      imageTimeout: 5000,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.93);

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();

    // Calcula dimensões mantendo proporção
    const canvasRatio = canvas.width / canvas.height;
    const pdfRatio = pdfW / pdfH;

    let imgW = pdfW;
    let imgH = pdfW / canvasRatio;

    if (imgH > pdfH) {
      imgH = pdfH;
      imgW = pdfH * canvasRatio;
    }

    const offsetX = (pdfW - imgW) / 2;
    const offsetY = (pdfH - imgH) / 2;

    pdf.addImage(imgData, "JPEG", offsetX, offsetY, imgW, imgH);

    const nomeAluno = dados.aluno
      ? `${dados.aluno.nome}_${dados.aluno.sobrenome}`.replace(/\s+/g, "_").toLowerCase()
      : "aluno";

    pdf.save(`boletim_${nomeAluno}_${getNomeMes(mes).toLowerCase()}_${ano}.pdf`);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
