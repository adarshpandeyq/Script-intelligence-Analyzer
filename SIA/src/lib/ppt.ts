import pptxgen from "pptxgenjs";
import JSZip from "jszip";
import { DECK_TITLE, SLIDES } from "./pptContent";

const BG = "07061A";
const PANEL = "161433";
const ACCENT = "8B5CF6";
const ACCENT2 = "38BDF8";
const TEXT = "E9E7FF";
const MUTED = "A5A0C8";

/** Builds the project presentation (same content as /ppt) and returns it as a Buffer. */
export async function buildProjectPptx(): Promise<Buffer> {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Script Intelligence Analyzer";
  pptx.company = "AI / NLP Project";
  pptx.title = `${DECK_TITLE} — Project Presentation`;
  pptx.subject = "AI-powered screenplay analysis";

  const decorate = (slide: pptxgen.Slide) => {
    slide.background = { color: BG };
    slide.addShape(pptx.ShapeType.ellipse, {
      x: -1.6,
      y: -2.2,
      w: 6,
      h: 6,
      fill: { color: "2A1B5E", transparency: 25 },
      line: { color: "2A1B5E", transparency: 100 },
    });
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 8.8,
      y: 3.8,
      w: 6,
      h: 6,
      fill: { color: "112C54", transparency: 25 },
      line: { color: "112C54", transparency: 100 },
    });
  };

  const header = (slide: pptxgen.Slide, title: string, kicker: string) => {
    slide.addText(kicker.toUpperCase(), {
      x: 0.7,
      y: 0.42,
      w: 11.9,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: ACCENT2,
    });
    slide.addText(title, {
      x: 0.7,
      y: 0.82,
      w: 11.9,
      h: 0.8,
      fontSize: 30,
      bold: true,
      color: TEXT,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.72,
      y: 1.78,
      w: 1.6,
      h: 0.06,
      fill: { color: ACCENT },
      line: { color: ACCENT, transparency: 100 },
    });
  };

  const card = (
    slide: pptxgen.Slide,
    opts: { x: number; y: number; w: number; h: number; heading: string; body: string; accent?: string },
  ) => {
    const accent = opts.accent ?? ACCENT;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      fill: { color: PANEL },
      line: { color: accent, width: 1 },
      rectRadius: 0.08,
    });
    slide.addText(opts.heading, {
      x: opts.x + 0.22,
      y: opts.y + 0.12,
      w: opts.w - 0.44,
      h: 0.35,
      fontSize: 13,
      bold: true,
      color: accent,
    });
    slide.addText(opts.body, {
      x: opts.x + 0.22,
      y: opts.y + 0.52,
      w: opts.w - 0.44,
      h: opts.h - 0.6,
      fontSize: 11,
      color: MUTED,
      valign: "top",
      wrap: true,
    });
  };

  const footer = (slide: pptxgen.Slide, index: number) => {
    slide.addText(
      `Script Intelligence Analyzer  •  AI / NLP Project  •  ${String(index).padStart(2, "0")}`,
      { x: 0.7, y: 6.85, w: 11.9, h: 0.35, fontSize: 10, color: MUTED, align: "right" },
    );
  };

  SLIDES.forEach((def, slideIndex) => {
    const slide = pptx.addSlide();
    decorate(slide);

    if (def.type === "title") {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.9,
        y: 1.9,
        w: 3.9,
        h: 0.55,
        fill: { color: PANEL },
        line: { color: ACCENT, width: 1 },
        rectRadius: 0.2,
      });
      slide.addText(def.kicker.toUpperCase(), {
        x: 0.9,
        y: 1.9,
        w: 3.9,
        h: 0.55,
        fontSize: 12,
        color: ACCENT2,
        align: "center",
        valign: "middle",
      });
      slide.addText(def.title, {
        x: 0.9,
        y: 2.65,
        w: 11.5,
        h: 1.2,
        fontSize: 48,
        bold: true,
        color: TEXT,
      });
      slide.addText(def.subtitle, {
        x: 0.9,
        y: 4.05,
        w: 11.5,
        h: 0.9,
        fontSize: 17,
        color: MUTED,
        lineSpacingMultiple: 1.2,
      });
      slide.addText(def.stack, {
        x: 0.9,
        y: 5.45,
        w: 11.5,
        h: 0.6,
        fontSize: 12,
        color: ACCENT2,
      });
    } else {
      header(slide, def.title, def.kicker);

      if (def.type === "bullets") {
        slide.addText(
          def.items.map((item) => ({ text: `▸   ${item}`, options: { breakLine: true } })),
          {
            x: 0.8,
            y: 2.1,
            w: 11.4,
            h: 4.9,
            fontSize: def.size ?? 16,
            color: TEXT,
            lineSpacingMultiple: 1.35,
            valign: "top",
            wrap: true,
          },
        );
      }

      if (def.type === "cards") {
        const cardH = def.cols === 3 ? 1.85 : 1.05;
        const rowH = def.cols === 3 ? 2.2 : 1.25;
        def.cards.forEach((c, i) => {
          card(slide, {
            x: 0.8 + (i % def.cols) * (def.cols === 3 ? 4.05 : 6.1),
            y: 2.3 + Math.floor(i / def.cols) * rowH,
            w: def.cols === 3 ? 3.7 : 5.7,
            h: cardH,
            heading: c.heading,
            body: c.body,
            accent: i % 2 === 0 ? ACCENT : ACCENT2,
          });
        });
      }

      if (def.type === "flow") {
        def.steps.forEach((step, i) => {
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.6 + i * 2.55,
            y: 2.7,
            w: 2.0,
            h: 1.3,
            fill: { color: PANEL },
            line: { color: i % 2 === 0 ? ACCENT : ACCENT2, width: 1 },
            rectRadius: 0.08,
          });
          slide.addText(step.split("\n").join("\n"), {
            x: 0.6 + i * 2.55,
            y: 2.7,
            w: 2.0,
            h: 1.3,
            fontSize: 12,
            bold: true,
            color: TEXT,
            align: "center",
            valign: "middle",
          });
          if (i < def.steps.length - 1) {
            slide.addText("➜", {
              x: 2.62 + i * 2.55,
              y: 3.05,
              w: 0.5,
              h: 0.5,
              fontSize: 18,
              color: ACCENT2,
              align: "center",
              valign: "middle",
            });
          }
        });
        def.bottom.forEach((c, i) => {
          card(slide, {
            x: 0.6 + i * 4.15,
            y: 4.5,
            w: 3.9,
            h: 1.6,
            heading: c.heading,
            body: c.body,
            accent: i % 2 === 0 ? ACCENT : ACCENT2,
          });
        });
      }
    }

    footer(slide, slideIndex + 1);
  });

  const output = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return addSlideTransitions(output);
}

/**
 * pptxgenjs has no animation API, so slide transitions are injected directly into
 * the slide XML after generation. CT_Slide child order is:
 *   p:cSld → p:clrMapOvr → p:transition → p:timing
 */
const TRANSITIONS = [
  '<p:transition spd="slow"><p:fade/></p:transition>',
  '<p:transition spd="med"><p:wipe dir="r"/></p:transition>',
  '<p:transition spd="med"><p:push dir="l"/></p:transition>',
  '<p:transition spd="med"><p:cover dir="l"/></p:transition>',
  '<p:transition spd="med"><p:split orient="horz" dir="out"/></p:transition>',
  '<p:transition spd="med"><p:randomBars dir="horz"/></p:transition>',
  '<p:transition spd="med"><p:circle/></p:transition>',
  '<p:transition spd="med"><p:blinds orient="horz" dir="vert"/></p:transition>',
  '<p:transition spd="med"><p:wheel spokes="4"/></p:transition>',
  '<p:transition spd="slow"><p:dissolve/></p:transition>',
];

async function addSlideTransitions(buffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const names = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));

  for (let i = 0; i < names.length; i += 1) {
    const file = zip.file(names[i]);
    if (!file) continue;
    const xml = await file.async("string");
    if (xml.includes("<p:transition")) continue;
    const markup =
      i === 0
        ? TRANSITIONS[0]
        : TRANSITIONS[i % TRANSITIONS.length].replace("<p:transition", '<p:transition advTm="7000"');
    const updated = xml.includes("</p:clrMapOvr>")
      ? xml.replace("</p:clrMapOvr>", `</p:clrMapOvr>${markup}`)
      : xml.replace("</p:cSld>", `</p:cSld>${markup}`);
    zip.file(names[i], updated);
  }

  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
