import { generateProxy } from "./pdfGen";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/build/pdf.worker.mjs";

const dataForm = document.querySelector("#data-form");
const outputFrame = document.querySelector("#output-frame");

const repeatRegex = /\[(\d+)\](?=\.[^.]+$)/;

dataForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const files = dataForm.querySelector("#files-input").files;
  const formData = {
    cardWidth: parseFloat(dataForm.querySelector("#card-width-input").value),
    cardHeight: parseFloat(dataForm.querySelector("#card-height-input").value),
    pageSize: dataForm.querySelector("#page-size-input").value,
    pageOrientation: dataForm.querySelector("#page-orientation-input").value,
    numCols: parseInt(dataForm.querySelector("#column-number-input").value),
    numRows: parseInt(dataForm.querySelector("#row-number-input").value),
    horizontalGap: parseFloat(
      dataForm.querySelector("#horizontal-gap-input").value,
    ),
    verticalGap: parseFloat(
      dataForm.querySelector("#vertical-gap-input").value,
    ),
    minHorizontalMargin: parseFloat(
      dataForm.querySelector("#min-horizontal-margin-input").value,
    ),
    minVerticalMargin: parseFloat(
      dataForm.querySelector("#min-vertical-margin-input").value,
    ),
  };

  const contentPromises = [];
  const metadata = [];
  for (const file of files) {
    let type;
    switch (file.type) {
      case "image/jpeg":
        type = "JPEG";
        break;
      case "image/png":
        type = "PNG";
        break;
      default:
        console.warn(`unsupported image type '${file.type}', skipping...`);
        break;
    }

    metadata.push({ type, name: file.name });
    contentPromises.push(file.arrayBuffer());
  }

  const allFilesBytes = await Promise.all(contentPromises);
  const images = allFilesBytes.flatMap((bytes, i) => {
    const obj = { bytes, type: metadata[i].type };

    const match = metadata[i].name.match(repeatRegex);

    let repeat = 1;
    if (match && match[1]) {
      repeat = parseInt(match[1], 10);
    }

    return Array(repeat).fill(obj);
  });

  const proxy = await generateProxy(images, formData);
  const pdfData = await proxy.save();

  await displayPdf(pdfData);
});

async function displayPdf(data) {
  const blob = new Blob([data], { type: "application/pdf" });
  let url = URL.createObjectURL(blob);
  outputFrame.src = `/vendor/pdfjs/web/viewer.html?file=${url}`;
}
