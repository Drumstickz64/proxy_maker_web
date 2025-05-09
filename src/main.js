import { generateProxy } from "./pdfGen";

pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/build/pdf.worker.mjs";

const dataForm = document.querySelector("#data-form");
const outputFrame = document.querySelector("#output-frame");

dataForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const files = dataForm.querySelector("#files-input").files;
  const formData = {
    numCols: parseInt(dataForm.querySelector("#column-number-input").value),
    numRows: parseInt(dataForm.querySelector("#row-number-input").value),
    horizontalGap: parseInt(
      dataForm.querySelector("#horizontal-gap-input").value
    ),
    verticalGap: parseInt(dataForm.querySelector("#vertical-gap-input").value),
    minHorizontalMargin: parseInt(
      dataForm.querySelector("#min-horizontal-margin-input").value
    ),
    minVerticalMargin: parseInt(
      dataForm.querySelector("#min-vertical-margin-input").value
    ),
  };

  const contentPromises = [];
  const types = [];
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

    types.push(type);
    contentPromises.push(file.arrayBuffer());
  }

  const allFilesBytes = await Promise.all(contentPromises);
  const images = allFilesBytes.map((bytes, i) => {
    return { bytes, type: types[i] };
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
