const photos = [
  ['Farmland', 'Charl Durand', 'vast-green-wheat-field-landscape-6566987'],
  ['Common bean', 'Yulia Rozanova', 'close-up-photo-of-raw-green-beans-3004798'],
  ['Potato', 'Marco Antonio Victorino', 'photo-of-potato-pile-2286776'],
  ['Tomato', 'Steve A Johnson', 'close-up-photography-of-tomatoes-851302'],
  ['Cucumber', 'Zul Sulong', 'close-up-of-cucumbers-17196492'],
];
export default function Sources() {
  return <section className="section page sources-page"><h1>Sources & methodology</h1>
    <section><h2>Climate observations</h2><p><a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER Daily API ↗</a> supplies historical temperature, rainfall and humidity for the selected location. These regional estimates are not field measurements or a forecast.</p></section>
    <section><h2>Crop references</h2><p>Soil pH and temperature ranges come from FAO ECOCROP.</p><ul>{[['Tomato',1379],['Potato',1971],['Common bean',1668],['Wheat',2114],['Cucumber',817]].map(([name,id]) => <li key={id}><a href={`https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=${id}`} target="_blank" rel="noreferrer">{name} ↗</a></li>)}</ul></section>
    <section><h2>How we calculate scores</h2><p>Crop score = 50% soil + 30% climate + 20% water. These fixed engineering weights are not probabilities of crop success.</p><p>Missing components remain unscored; the available weights are rescaled. Soil may use pH alone. Climate includes temperature and an unverified planting-calendar assumption. Water is incomplete until crop coefficients, reference evapotranspiration and effective rainfall can be combined.</p><p>Salinity requires method-compatible ECe thresholds. Organic matter, texture and nutrients remain context. Rotation plans use crop suitability and family transitions; they do not simulate future soil health or yields.</p></section>
    <section><h2>Soil reports & AI</h2><p>Uploading a report sends it to Google Gemini for extraction. Review the measurements against the original and confirm them before continuing. You can also enter measurements manually.</p><p>Crop ranking uses the scoring engine. Gemini explanation support exists in the backend; this interface uses calculated summaries.</p></section>
    <section><h2>Demo & saved analyses</h2><p>The demo uses fictional soil and climate values and makes no NASA or Gemini request. Saved analyses stay in this browser's local storage.</p></section>
    <section><h2>Photography</h2><p>Photos are stored locally in optimized WebP format and used under the <a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">Pexels License</a>. They illustrate crops and farmland; they are not images of the user's field.</p><ul>{photos.map(([label,author,slug]) => <li key={slug}><a href={`https://www.pexels.com/photo/${slug}/`} target="_blank" rel="noreferrer">{label} — {author} ↗</a></li>)}</ul><p>Typography: DM Sans via Google Fonts.</p></section>
  </section>;
}

