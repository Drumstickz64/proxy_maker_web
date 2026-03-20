import { PageSizes, PDFDocument } from "pdf-lib";

export const defaultArgs = {
  cardWidth: 59,
  cardHeight: 86,
  pageSize: "A4",
  pageOrientation: "landscape",
  numCols: 4,
  numRows: 2,
  horizontalGap: 3,
  verticalGap: 3,
  minHorizontalMargin: 0,
  minVerticalMargin: 0,
};

export async function generateProxy(images, args) {
  const pdfDoc = await PDFDocument.create();

  const cardWidthTypicalPx = mmToPx(args.cardWidth);
  const cardHeightTypicalPx = mmToPx(args.cardHeight);

  let pageSize = PageSizes[args.pageSize];
  if (args.pageOrientation === "landscape") {
    pageSize = portraitToLandscape(pageSize);
  }
  const [pageWidth, pageHeight] = pageSize;

  const horizontalGapPx = mmToPx(args.horizontalGap);
  const verticalGapPx = mmToPx(args.verticalGap);
  const minHorizontalMarginPx = mmToPx(args.minHorizontalMargin);
  const minVerticalMarginPx = mmToPx(args.minVerticalMargin);

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
    pageWidth,
    minHorizontalMarginPx,
    args.numCols,
    horizontalGapPx
  );
  const maxCardHeight = calcCardDim(
    pageHeight,
    minVerticalMarginPx,
    args.numRows,
    verticalGapPx
  );

  // There is a method `PDFImage.scaleToFit` that does a similar thing to this
  // but uses actual dimensions of the image instead of the dimensions
  // of a typical card
  //
  // A method that uses scaleToFit would (I assume) have a messed up layout if
  // any of the images had a different aspect-ratio than the others
  //
  // Where as this method would distort the image to keep the layout consistent
  const cardWidthScale = maxCardWidth / cardWidthTypicalPx;
  const cardHeightScale = maxCardHeight / cardHeightTypicalPx;
  const cardScale = Math.min(cardWidthScale, cardHeightScale);

  let cardWidth = cardWidthTypicalPx * cardScale;
  let cardHeight = cardHeightTypicalPx * cardScale;

  const horizontalMargin = calcActualMarginSize(
    cardWidth,
    pageWidth,
    args.numCols,
    horizontalGapPx
  );
  const verticalMargin = calcActualMarginSize(
    cardHeight,
    pageHeight,
    args.numRows,
    verticalGapPx
  );

  const numPages = imageObjs.length / (args.numCols * args.numRows);

  pageLoop: for (let pageIndex = 0; pageIndex < numPages; pageIndex++) {
    const page = pdfDoc.addPage(pageSize);

    for (let row = 0; row < args.numRows; row++) {
      for (let col = 0; col < args.numCols; col++) {
        const imageIndex =
          pageIndex * args.numRows * args.numCols + row * args.numCols + col;

        if (imageIndex >= imageObjs.length) {
          break pageLoop;
        }
        const imageObj = imageObjs[imageIndex];
        page.drawImage(imageObj, {
          x: horizontalMargin / 2 + col * (cardWidth + horizontalGapPx),
          y: verticalMargin / 2 + row * (cardHeight + verticalGapPx),
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
