window.addEventListener("DOMContentLoaded", () => {
  console.log("[TheoCapital] app.js loaded");

  const tbody = document.getElementById("tbody");
  if (!tbody) {
    console.error("Missing <tbody id='tbody'></tbody> in index.html");
    return;
  }

  tbody.innerHTML = `
    <tr>
      <td>Test Row</td>
      <td>TEST.SW</td>
      <td>100.00</td>
      <td>110.00</td>
      <td><span class="tc-badge2 tc-discount">+9.09%</span></td>
      <td class="tc-pos">+1.00</td>
      <td class="tc-pos">+1.00%</td>
    </tr>
  `;
});
