import axios from 'axios';

const TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';
const PROXY_URL = 'https://corsproxy.io/?';

export const tcmbService = {
    async fetchUSDRate() {
        try {
            const response = await axios.get(`${PROXY_URL}${encodeURIComponent(TCMB_URL)}`);
            const xmlText = response.data;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const currencies = xmlDoc.getElementsByTagName("Currency");
            let usdRate = null;

            for (let i = 0; i < currencies.length; i++) {
                if (currencies[i].getAttribute("CurrencyCode") === "USD") {
                    const sellingStr = currencies[i].getElementsByTagName("BanknoteSelling")[0]?.textContent;
                    if (sellingStr) {
                        usdRate = parseFloat(sellingStr.replace(',', '.'));
                    }
                    break;
                }
            }

            if (!usdRate) {
                console.error("USD rate not found in TCMB data");
                return null;
            }

            return usdRate;
        } catch (error) {
            console.error('TCMB kur çekme hatası:', error)
            // Fallback to a recent approximate rate if fetch fails to prevent calculation errors
            return 34.50
        }
    }
};
