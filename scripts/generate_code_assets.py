"""
Codebase Snippet Image Generator for Presentation Slides.
Reads the ACTUAL, existing source files directly from disk (src/engine.py, src/workload.py).
Renders sleek, dark-mode/AMOLED macOS-style window cards with exact line numbers and syntax highlighting.
"""

import os
from PIL import Image, ImageDraw, ImageFont
from pygments.lexers import PythonLexer
from pygments import lex
from pygments.token import Token

FONT_PATH = os.path.join(os.environ.get('WINDIR', 'C:/Windows'), 'Fonts', 'consola.ttf')

# AMOLED Theme Color Palette
PALETTE = {
    'bg': (9, 9, 11, 255),               # #09090B Pitch AMOLED
    'window_bg': (18, 18, 22, 255),      # #121216 Window Canvas
    'window_border': (39, 39, 42, 255),  # #27272A Subtle Border
    'title_bg': (24, 24, 28, 255),       # #18181C Window Title Bar
    'title_text': (161, 161, 170, 255),  # #A1A1AA Mono Title
    'badge_bg': (39, 39, 42, 255),       # #27272A Badge background
    'badge_text': (16, 185, 129, 255),   # #10B981 Soft Emerald
    'line_num': (113, 113, 122, 255),    # #71717A Line Numbers
    'line_div': (39, 39, 42, 255),       # Line Divider
    # Syntax Tokens
    Token.Keyword: (192, 132, 252, 255),       # #C084FC Purple
    Token.Keyword.Constant: (244, 63, 94, 255),# #F43F5E Rose
    Token.Name.Function: (96, 165, 250, 255),  # #60A5FA Soft Blue
    Token.Name.Class: (56, 189, 248, 255),     # #38BDF8 Sky Blue
    Token.Name.Builtin: (56, 189, 248, 255),   # Sky
    Token.String: (52, 211, 153, 255),         # #34D399 Emerald
    Token.String.Doc: (161, 161, 170, 255),    # #A1A1AA Muted Slate
    Token.Number: (251, 191, 36, 255),         # #FBBF24 Amber
    Token.Comment: (113, 113, 122, 255),       # #71717A Muted Slate
    Token.Operator: (244, 63, 94, 255),        # #F43F5E Rose
    Token.Punctuation: (212, 212, 216, 255),   # #D4D4D8 Light Gray
    Token.Text: (244, 244, 245, 255),          # #F4F4F5 Pure White/Zinc
    Token.Name: (228, 228, 231, 255),          # #E4E4E7 Off-White
}

def get_token_color(token_type):
    while token_type:
        if token_type in PALETTE:
            return PALETTE[token_type]
        token_type = token_type.parent
    return PALETTE[Token.Text]

def render_code_card(
    code_text: str,
    title: str,
    badge: str,
    output_filenames: list,
    start_line_num: int = 1,
    font_size: int = 18,
    scale: int = 2
):
    """
    Renders high-resolution macOS-style window card for actual repository code.
    Preserves exact file line numbering.
    """
    raw_lines = code_text.splitlines()
    num_lines = len(raw_lines)

    # Base dimensions (unscaled)
    char_w = 11
    line_h = 28
    pad_x = 36
    pad_y = 36
    header_h = 44
    line_num_w = 64

    max_line_len = max(len(l) for l in raw_lines) if raw_lines else 60
    content_w = line_num_w + (max_line_len * char_w) + 40
    card_w = max(860, content_w + (pad_x * 2))
    card_h = header_h + (num_lines * line_h) + (pad_y * 2)

    total_w = card_w + 80
    total_h = card_h + 80

    # High-DPI supersampling
    sw = total_w * scale
    sh = total_h * scale
    img = Image.new('RGBA', (sw, sh), PALETTE['bg'])
    draw = ImageDraw.Draw(img)

    # Fonts
    font = ImageFont.truetype(FONT_PATH, font_size * scale)
    title_font = ImageFont.truetype(FONT_PATH, int(font_size * 0.85) * scale)
    badge_font = ImageFont.truetype(FONT_PATH, int(font_size * 0.75) * scale)

    # Card coordinates
    cx1 = 40 * scale
    cy1 = 40 * scale
    cx2 = (40 + card_w) * scale
    cy2 = (40 + card_h) * scale
    radius = 12 * scale

    # Card background & border
    draw.rounded_rectangle([cx1, cy1, cx2, cy2], radius=radius, fill=PALETTE['window_bg'], outline=PALETTE['window_border'], width=2 * scale)

    # Header bar
    h_bottom = cy1 + (header_h * scale)
    draw.rounded_rectangle([cx1, cy1, cx2, h_bottom], radius=radius, fill=PALETTE['title_bg'])
    draw.rectangle([cx1, h_bottom - radius, cx2, h_bottom], fill=PALETTE['title_bg'])
    draw.line([cx1, h_bottom, cx2, h_bottom], fill=PALETTE['window_border'], width=1 * scale)

    # Window Control Dots (macOS style)
    dot_y = cy1 + int(header_h * scale / 2)
    dot_r = 6 * scale
    dot_x0 = cx1 + (20 * scale)
    dot_spacing = 18 * scale

    dots = [
        (239, 68, 68, 255),   # Red
        (245, 158, 11, 255),  # Yellow
        (16, 185, 129, 255),  # Green
    ]
    for i, color in enumerate(dots):
        x = dot_x0 + (i * dot_spacing)
        draw.ellipse([x - dot_r, dot_y - dot_r, x + dot_r, dot_y + dot_r], fill=color)

    # Title in header
    title_x = dot_x0 + (len(dots) * dot_spacing) + (16 * scale)
    draw.text((title_x, dot_y - (10 * scale)), title, fill=PALETTE['title_text'], font=title_font)

    # Badge in header (right side)
    if badge:
        bbox = draw.textbbox((0, 0), badge, font=badge_font)
        bw = bbox[2] - bbox[0]
        bh = bbox[3] - bbox[1]
        bx2 = cx2 - (20 * scale)
        bx1 = bx2 - bw - (16 * scale)
        by1 = dot_y - int(bh / 2) - (4 * scale)
        by2 = dot_y + int(bh / 2) + (4 * scale)
        draw.rounded_rectangle([bx1, by1, bx2, by2], radius=4 * scale, fill=PALETTE['badge_bg'])
        draw.text((bx1 + (8 * scale), by1 + (2 * scale)), badge, fill=PALETTE['badge_text'], font=badge_font)

    # Code Rendering
    code_start_x = cx1 + (pad_x * scale) + (line_num_w * scale)
    code_start_y = h_bottom + (20 * scale)

    # Line number separator
    div_x = code_start_x - (16 * scale)
    draw.line([div_x, h_bottom, div_x, cy2 - (10 * scale)], fill=PALETTE['line_div'], width=1 * scale)

    lexer = PythonLexer()
    tokens = list(lex(code_text, lexer))

    line_idx = 0
    curr_x = code_start_x
    curr_y = code_start_y

    # Draw first line number
    draw.text((cx1 + (16 * scale), curr_y), f"{start_line_num + line_idx:4d}", fill=PALETTE['line_num'], font=font)

    for token_type, val in tokens:
        color = get_token_color(token_type)
        parts = val.split('\n')
        for idx, part in enumerate(parts):
            if idx > 0:
                line_idx += 1
                curr_x = code_start_x
                curr_y += (line_h * scale)
                if line_idx < num_lines:
                    draw.text((cx1 + (16 * scale), curr_y), f"{start_line_num + line_idx:4d}", fill=PALETTE['line_num'], font=font)
            if part:
                draw.text((curr_x, curr_y), part, fill=color, font=font)
                bbox = draw.textbbox((curr_x, curr_y), part, font=font)
                curr_x += (bbox[2] - bbox[0])

    os.makedirs('project_assets', exist_ok=True)
    for fname in output_filenames:
        out_path = os.path.join('project_assets', fname)
        img.save(out_path, format='PNG', optimize=True)
        print(f"Saved: {out_path} ({sw}x{sh}) [Lines {start_line_num}-{start_line_num + num_lines - 1}]")


def extract_and_generate_all():
    print("Reading ACTUAL repository source files from disk...")

    # Load actual src/engine.py
    engine_path = os.path.abspath('src/engine.py')
    with open(engine_path, 'r', encoding='utf-8') as f:
        engine_lines = f.readlines()
    print(f"Loaded {engine_path} ({len(engine_lines)} lines)")

    # Load actual src/workload.py
    workload_path = os.path.abspath('src/workload.py')
    with open(workload_path, 'r', encoding='utf-8') as f:
        workload_lines = f.readlines()
    print(f"Loaded {workload_path} ({len(workload_lines)} lines)")

    # Helper: dedent class methods by 4 spaces while preserving relative indentation
    def clean_slice(lines, start_idx, end_idx):
        sliced = lines[start_idx:end_idx]
        result = []
        for l in sliced:
            if l.startswith('    '):
                result.append(l[4:])
            elif l.strip() == '':
                result.append('\n')
            else:
                result.append(l)
        return ''.join(result)

    # ----------------------------------------------------
    # SNIPPET 1: The Core Math (_select_victim_hybrid)
    # Exact lines: 735 to 790 in src/engine.py
    # ----------------------------------------------------
    code1 = clean_slice(engine_lines, 734, 790)
    render_code_card(
        code_text=code1,
        title="src/engine.py — _select_victim_hybrid()",
        badge="Live Math: C(p) = S(p) + δ",
        output_filenames=["core_math_hybrid_decay.png"],
        start_line_num=735
    )

    # ----------------------------------------------------
    # SNIPPET 2: Dynamic Tuning (AdaptiveParameterController)
    # Exact lines: 102 to 145 in src/engine.py
    # Shows record_access() and tune() with fault thresholds:
    #   r > 0.10 -> lambda += 0.05
    #   r < 0.02 -> lambda -= 0.05
    # ----------------------------------------------------
    code2 = clean_slice(engine_lines, 101, 145)
    render_code_card(
        code_text=code2,
        title="src/engine.py — AdaptiveParameterController.tune()",
        badge="Autonomous λ Dial",
        output_filenames=["dynamic_tuning_controller.png"],
        start_line_num=102
    )

    # ----------------------------------------------------
    # SNIPPET 3: Baseline Policies (_select_victim_fifo & _select_victim_lru)
    # Exact lines: 672 to 713 in src/engine.py
    # Shows standard FIFO and LRU implementations
    # ----------------------------------------------------
    code3 = clean_slice(engine_lines, 671, 713)
    render_code_card(
        code_text=code3,
        title="src/engine.py — _select_victim_fifo() & _select_victim_lru()",
        badge="Baseline Policies",
        output_filenames=["baseline_policies_fifo_lru.png", "baseline_algorithms_fifo_lru_lfu.png"],
        start_line_num=672
    )

    # ----------------------------------------------------
    # SNIPPET 4: Workload Generation (generate_zipf_hot_cold)
    # Exact lines: 251 to 314 in src/workload.py
    # Shows 80/20 Pareto/Zipf temporal locality generation
    # ----------------------------------------------------
    code4 = clean_slice(workload_lines, 250, 314)
    render_code_card(
        code_text=code4,
        title="src/workload.py — generate_zipf_hot_cold()",
        badge="Zipf 80/20 Workload",
        output_filenames=["workload_generation_zipf.png", "workload_generation_zipf_loop.png"],
        start_line_num=251
    )

if __name__ == '__main__':
    extract_and_generate_all()
