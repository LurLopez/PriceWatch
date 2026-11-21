#!/usr/bin/env python3
"""Genera la memoria Word (.docx) a partir de docs/MEMORIA-EF.md."""

from __future__ import annotations

import re
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "MEMORIA-EF.md"
OUTPUT = ROOT / "docs" / "Memoria_ProyectoFinal_PriceWatch.docx"
OUTPUT_ROOT = ROOT / "Memoria_ProyectoFinal_PriceWatch.docx"

BLUE = RGBColor(0x1D, 0x4E, 0xD8)
DARK = RGBColor(0x0F, 0x17, 0x2A)
MUTED = RGBColor(0x64, 0x74, 0x8B)
CODE_BG = "F1F5F9"


def shade(paragraph, fill: str = CODE_BG) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    p_pr.append(shd)


def bottom_border(paragraph, color: str = "2563EB", size: str = "12") -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "6")
    bottom.set(qn("w:color"), color)
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def add_page_number(paragraph) -> None:
    run = paragraph.add_run()
    fld_begin = OxmlElement("w:fldChar")
    fld_begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    fld_end = OxmlElement("w:fldChar")
    fld_end.set(qn("w:fldCharType"), "end")
    run._r.append(fld_begin)
    run._r.append(instr)
    run._r.append(fld_end)


def add_inline(paragraph, text: str, size: int = 11) -> None:
    """Añade texto con **negrita**, `código`, *cursiva* y enlaces."""
    text = text.strip()
    if not text:
        return
    pattern = re.compile(
        r"(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\([^)]+\))"
    )
    for token in pattern.split(text):
        if not token:
            continue
        if token.startswith("**") and token.endswith("**") and len(token) > 4:
            run = paragraph.add_run(token[2:-2])
            run.bold = True
        elif token.startswith("`") and token.endswith("`") and len(token) > 2:
            run = paragraph.add_run(token[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(max(8, size - 1))
        elif token.startswith("*") and token.endswith("*") and len(token) > 2:
            run = paragraph.add_run(token[1:-1])
            run.italic = True
        else:
            link = re.fullmatch(r"\[([^\]]+)\]\(([^)]+)\)", token)
            if link:
                paragraph.add_run(f"{link.group(1)} ({link.group(2)})")
            else:
                paragraph.add_run(token)


def add_code_block(doc: Document, lines: list[str]) -> None:
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.space_before = Pt(4)
    paragraph.paragraph_format.space_after = Pt(8)
    paragraph.paragraph_format.left_indent = Cm(0.3)
    run = paragraph.add_run("\n".join(lines))
    run.font.name = "Consolas"
    run.font.size = Pt(8.5)
    run.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    shade(paragraph)


def add_table(doc: Document, rows: list[list[str]]) -> None:
    if not rows:
        return
    columns = len(rows[0])
    table = doc.add_table(rows=1, cols=columns)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True

    header = table.rows[0].cells
    for index, cell_text in enumerate(rows[0]):
        header[index].text = ""
        paragraph = header[index].paragraphs[0]
        add_inline(paragraph, cell_text, size=9)
        for run in paragraph.runs:
            run.bold = True
            run.font.size = Pt(9)
        # Fondo azul claro para el encabezado.
        tc_pr = header[index]._tc.get_or_add_tcPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "DBEAFE")
        tc_pr.append(shd)

    for row in rows[1:]:
        cells = table.add_row().cells
        for index in range(columns):
            value = row[index] if index < len(row) else ""
            cells[index].text = ""
            paragraph = cells[index].paragraphs[0]
            add_inline(paragraph, value, size=9)
            for run in paragraph.runs:
                run.font.size = Pt(9)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def is_table_separator(line: str) -> bool:
    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
    return all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells)


def parse_markdown() -> tuple[list[tuple[int, str]], list[str]]:
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    # Saltar la portada/metadata inicial.
    start = 0
    for index, line in enumerate(lines):
        if line.strip() == "---" and index > 0:
            start = index + 1
            break

    content = lines[start:]
    headings: list[tuple[int, str]] = []
    in_code = False
    for line in content:
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code:
            continue
        match = re.match(r"^(#{1,3})\s+(.+)$", line)
        if match:
            headings.append((len(match.group(1)), match.group(2).strip()))
    return headings, content


def add_cover(doc: Document) -> None:
    for _ in range(2):
        doc.add_paragraph()

    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("PriceWatch")
    run.bold = True
    run.font.size = Pt(34)
    run.font.color.rgb = BLUE
    run.font.name = "Calibri"

    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle.add_run("Comparador Multicriterio Inteligente")
    run.font.size = Pt(16)
    run.font.color.rgb = DARK

    line = doc.add_paragraph()
    line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    bottom_border(line, "2563EB", "18")

    doc.add_paragraph()
    cover_title = doc.add_paragraph()
    cover_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cover_title.add_run("Memoria técnica — Proyecto Final")
    run.bold = True
    run.font.size = Pt(18)
    run.font.color.rgb = DARK

    subtitle2 = doc.add_paragraph()
    subtitle2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle2.add_run("Ingeniería Web Avanzada · OII436-1 · PUCV")
    run.font.size = Pt(12)
    run.font.color.rgb = MUTED

    doc.add_paragraph()
    table = doc.add_table(rows=0, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = "Table Grid"
    rows = [
        ("Autor", "Lur Lopez Fraile"),
        ("Fecha", "21 de noviembre de 2026"),
        ("Versión", "1.0.0-ef"),
        ("Repositorio", "https://github.com/LurLopez/PriceWatch"),
        ("Estado", "Implementación completa; staging y Figma requieren credenciales del equipo"),
    ]
    for label, value in rows:
        cells = table.add_row().cells
        cells[0].text = label
        cells[1].text = value
        for paragraph in cells[0].paragraphs:
            for run in paragraph.runs:
                run.bold = True
                run.font.size = Pt(10)
        for paragraph in cells[1].paragraphs:
            for run in paragraph.runs:
                run.font.size = Pt(10)

    doc.add_paragraph()
    image = ROOT / "docs" / "evidencias" / "pwa-login.png"
    if image.exists():
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.add_run().add_picture(str(image), width=Inches(4.8))
        caption = doc.add_paragraph()
        caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = caption.add_run("Interfaz real de PriceWatch — login con Ionic")
        run.italic = True
        run.font.size = Pt(9)
        run.font.color.rgb = MUTED

    doc.add_page_break()


def add_toc(doc: Document, headings: list[tuple[int, str]]) -> None:
    title = doc.add_paragraph()
    run = title.add_run("Índice")
    run.bold = True
    run.font.size = Pt(20)
    run.font.color.rgb = BLUE
    bottom_border(title, "2563EB", "12")

    for level, text in headings:
        if level == 1 and text.lower().startswith("memoria técnica"):
            continue
        paragraph = doc.add_paragraph()
        paragraph.paragraph_format.left_indent = Cm(0.5 * (level - 1))
        paragraph.paragraph_format.space_after = Pt(2)
        run = paragraph.add_run(text)
        run.font.size = Pt(10.5 if level == 1 else 9.5)
        run.bold = level == 1
        if level > 1:
            run.font.color.rgb = MUTED

    note = doc.add_paragraph()
    run = note.add_run(
        "Nota: este índice es estático. En Word se puede insertar una tabla de contenido "
        "actualizable desde Referencias → Tabla de contenido."
    )
    run.italic = True
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED
    doc.add_page_break()


def add_body(doc: Document, content: list[str]) -> None:
    in_code = False
    code_lines: list[str] = []
    table_lines: list[str] = []
    first_h1 = True

    def flush_table() -> None:
        nonlocal table_lines
        if not table_lines:
            return
        rows: list[list[str]] = []
        for line in table_lines:
            if is_table_separator(line):
                continue
            rows.append([cell.strip() for cell in line.strip().strip("|").split("|")])
        add_table(doc, rows)
        table_lines = []

    for line in content:
        stripped = line.strip()

        if in_code:
            if stripped.startswith("```"):
                add_code_block(doc, code_lines)
                code_lines = []
                in_code = False
            else:
                code_lines.append(line)
            continue

        if stripped.startswith("```"):
            flush_table()
            in_code = True
            continue

        if stripped.startswith("|"):
            table_lines.append(stripped)
            continue
        flush_table()

        if not stripped:
            continue

        if stripped == "---":
            continue

        heading = re.match(r"^(#{1,3})\s+(.+)$", stripped)
        if heading:
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1 and first_h1:
                first_h1 = False
            paragraph = doc.add_heading(level=level)
            if level == 1 or (level == 2 and re.match(r"^\d+\.\s", text)):
                paragraph.paragraph_format.page_break_before = True
            add_inline(paragraph, text, size={1: 18, 2: 14, 3: 12}[level])
            for run in paragraph.runs:
                run.font.color.rgb = BLUE if level == 1 else DARK
                run.bold = True
                run.font.name = "Calibri"
            continue

        image_match = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", stripped)
        if image_match:
            alt, path = image_match.groups()
            image_path = ROOT / path
            if image_path.exists():
                paragraph = doc.add_paragraph()
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
                try:
                    paragraph.add_run().add_picture(
                        str(image_path), width=Inches(6.2)
                    )
                except Exception:
                    paragraph.add_run(f"[Imagen: {alt}]")
                caption = doc.add_paragraph()
                caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = caption.add_run(alt)
                run.italic = True
                run.font.size = Pt(9)
                run.font.color.rgb = MUTED
            else:
                paragraph = doc.add_paragraph()
                run = paragraph.add_run(f"[Imagen no encontrada: {path}]")
                run.italic = True
                run.font.color.rgb = MUTED
            continue

        if stripped.startswith("> "):
            paragraph = doc.add_paragraph()
            paragraph.paragraph_format.left_indent = Cm(0.5)
            add_inline(paragraph, stripped[2:])
            for run in paragraph.runs:
                run.italic = True
                run.font.color.rgb = MUTED
            continue

        bullet = re.match(r"^[-*]\s+(.+)$", stripped)
        if bullet:
            paragraph = doc.add_paragraph(style="List Bullet")
            add_inline(paragraph, bullet.group(1))
            continue

        numbered = re.match(r"^\d+\.\s+(.+)$", stripped)
        if numbered:
            paragraph = doc.add_paragraph(style="List Number")
            add_inline(paragraph, numbered.group(1))
            continue

        paragraph = doc.add_paragraph()
        add_inline(paragraph, stripped)


def add_footer(doc: Document) -> None:
    section = doc.sections[0]
    footer = section.footer
    paragraph = footer.paragraphs[0]
    paragraph.text = ""
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("PriceWatch — Memoria técnica EF · página ")
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED
    add_page_number(paragraph)


def main() -> None:
    headings, content = parse_markdown()
    doc = Document()

    section = doc.sections[0]
    section.page_height = Cm(29.7)
    section.page_width = Cm(21.0)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.2)
    section.left_margin = Cm(2.2)
    section.right_margin = Cm(2.2)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(10.5)
    normal.paragraph_format.space_after = Pt(5)
    normal.paragraph_format.line_spacing = 1.12

    add_cover(doc)
    add_toc(doc, headings)
    add_body(doc, content)
    add_footer(doc)

    doc.save(OUTPUT)
    doc.save(OUTPUT_ROOT)
    print(f"DOCX generado: {OUTPUT}")
    print(f"Copia en raíz: {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
