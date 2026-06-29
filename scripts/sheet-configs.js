
// Configuration
// https://docs.google.com/spreadsheets/d/1ulejCO_HgJBGI90YMUEK_GeNrbJULFcs6LXx16bqRRg/edit?usp=sharing
export const SPREADSHEET_ID = '1ulejCO_HgJBGI90YMUEK_GeNrbJULFcs6LXx16bqRRg';

/**
 * Fetches multiple sheets concurrently and applies data to the DOM
 * @param {string} spreadsheetId - The unique ID of the Google Sheet
 * @param {string[]} sheetNames - Array of tab names to process
 */
export async function initMultiSheetConfig(spreadsheetId, sheetNames) {
    try {
        // 1. Generate URLs for every single sheet name
        const fetchPromises = sheetNames.map(sheetName => {
            const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

            return fetch(url)
                .then(res => res.text())
                .then(text => {
                    // Extract valid JSON from Google's response wrapper
                    const jsonString = text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1);
                    return JSON.parse(jsonString);
                })
                .catch(err => {
                    console.error(`Error loading tab "${sheetName}":`, err);
                    return null; // Fail gracefully for individual sheets
                });
        });

        // 2. Fetch all sheets in parallel
        const completedResults = await Promise.all(fetchPromises);

        // 3. Flatten all sheet rows into one universal key-value map
        const configMap = {};

        completedResults.forEach(json => {
            if (!json || !json.table || !json.table.rows) return;

            json.table.rows.forEach(row => {
                if (row.c && row.c[0] && row.c[1]) {
                    const key = row.c[0].v;

                    // Grab calculated formula text (.f) or fallback to raw value (.v)
                    const value = row.c[1].f !== undefined ? row.c[1].f : row.c[1].v;

                    if (key) {
                        const cleanKey = key.toString().trim();
                        // Optional: Prevents tabs processed later from accidentally overwriting keys
                        if (!configMap.hasOwnProperty(cleanKey)) {
                            configMap[cleanKey] = value !== null ? value.toString() : "";
                        }
                    }
                }
            });
        });

        // 4. Find all custom tagged elements in the HTML
        const elements = document.querySelectorAll(`[data-config-id]`);

        elements.forEach(element => {
            const configId = element.getAttribute('data-config-id');
            const targetAttribute = element.getAttribute('data-config-attribute') || 'innerHTML';

            // 5. Inject value if the key exists anywhere in the aggregated sheet data
            if (configMap.hasOwnProperty(configId)) {
                const freshValue = configMap[configId];

                if (targetAttribute === 'innerHTML') {
                    element.innerHTML = freshValue;
                } else if (targetAttribute === 'textContent') {
                    element.textContent = freshValue;
                } else {
                    element.setAttribute(targetAttribute, freshValue);
                }
            }
        });

        console.log(`Successfully mapped ${Object.keys(configMap).length} keys from tabs: [${sheetNames.join(', ')}]`);
        window.configMap = configMap;

    } catch (error) {
        console.error("Critical failure during multi-sheet aggregation:", error);
    }
}
