import { PageSizes, PDFDocument } from "pdf-lib";

const TYPICAL_CARD_WIDTH = mmToPx(59);
const TYPICAL_CARD_HEIGHT = mmToPx(86);
const PAGE_SIZE = portraitToLandscape(PageSizes.A4);
const [PAGE_WIDTH, PAGE_HEIGHT] = PAGE_SIZE;

export async function generateProxy(images, args) {
  const pdfDoc = await PDFDocument.create();

  const imageObjs = await Promise.all(
    images.map(async (image) => {
      switch (image.type) {
        case "JPEG":
          return pdfDoc.embedJpg(image.bytes);
        case "PNG":
          return pdfDoc.embedPng(image.bytes);
        default:
          throw new Error("UNREACHABLE");
      }
    })
  );

  const maxCardWidth = calcCardDim(
    PAGE_WIDTH,
    args.minHorizontalMargin,
    args.numCols,
    args.horizontalGap
  );
  const maxCardHeight = calcCardDim(
    PAGE_HEIGHT,
    args.minVerticalMargin,
    args.numRows,
    args.verticalGap
  );

  // There is a method `PDFImage.scaleToFit` that does a similar thing to this
  // but uses actual dimensions of the image instead of the dimensions
  // of a typical Yu-Gi-Oh card
  //
  // A method that uses scaleToFit would (I assume) have a messed up layout if
  // any of the images had a different aspect-ratio than the others
  //
  // Where as this method would distort the image to keep the layout consistent
  const cardWidthScale = maxCardWidth / TYPICAL_CARD_WIDTH;
  const cardHeightScale = maxCardHeight / TYPICAL_CARD_HEIGHT;
  const cardScale = Math.min(cardWidthScale, cardHeightScale);

  let cardWidth = TYPICAL_CARD_WIDTH * cardScale;
  let cardHeight = TYPICAL_CARD_HEIGHT * cardScale;

  const horizontalMargin = calcActualMarginSize(
    cardWidth,
    PAGE_WIDTH,
    args.numCols,
    args.horizontalGap
  );
  const verticalMargin = calcActualMarginSize(
    cardHeight,
    PAGE_HEIGHT,
    args.numRows,
    args.verticalGap
  );

  const numPages = imageObjs.length / (args.numCols * args.numRows);

  pageLoop: for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    const page = pdfDoc.addPage(PAGE_SIZE);

    for (let row = 0; row < args.numRows; row++) {
      for (let col = 0; col < args.numCols; col++) {
        const imageIndex =
          pageIndex * args.numRows * args.numCols + row * args.numCols + col;

        if (imageIndex >= imageObjs.length) {
          break pageLoop;
        }
        const imageObj = imageObjs[imageIndex];
        page.drawImage(imageObj, {
          x: horizontalMargin / 2 + col * (cardWidth + args.horizontalGap),
          y: verticalMargin / 2 + row * (cardHeight + args.verticalGap),
          width: cardWidth,
          height: cardHeight,
        });
      }
    }
  }

  return pdfDoc;
}

function calcCardDim(totalSize, margin, numItems, gapSize) {
  let contentSize = calcContentSize(totalSize, margin, numItems, gapSize);

  return contentSize / numItems;
}

function calcContentSize(totalSize, margin, numItems, gapSize) {
  let totalGapSize = (numItems - 1) * gapSize;

  return totalSize - (margin + totalGapSize);
}

function calcActualMarginSize(cardSize, pageSize, numCards, gap) {
  const contentSize = numCards * cardSize;
  const totalGapSize = (numCards - 1) * gap;
  const margin = pageSize - (contentSize + totalGapSize);

  return margin;
}

function mmToPx(mm) {
  return mm * 2.8346666667;
}

function portraitToLandscape([width, height]) {
  return [height, width];
}
