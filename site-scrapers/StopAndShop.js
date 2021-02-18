const sites = require("../data/sites.json");

const noAppointmentMatchString = "no locations with available appointments";

module.exports = async function GetAvailableAppointments(browser) {
    console.log("StopAndShop starting.");
    const webData = await ScrapeWebsiteData(browser);
    console.log("StopAndShop done.");
    return sites.StopAndShop.locations.map((loc) => {
        const response = webData[loc.zip];
        return {
            name: `Stop & Shop (${loc.city})`,
            hasAvailability: response.indexOf(noAppointmentMatchString) == -1,
            extraData: response.length
                ? response.substring(1, response.length - 1)
                : response, //take out extra quotes
            signUpLink: sites.StopAndShop.website,
            ...loc,
        };
    });
};

async function ScrapeWebsiteData(browser) {
    const page = await browser.newPage();
    await page.goto(sites.StopAndShop.website);
    await page.solveRecaptchas().then(({ solved }) => {
        if (solved.length) {
            return page.waitForNavigation();
        } else {
            return;
        }
    });

  // Make sure we are not "stuck in line."
  page.waitForSelector('#zip-input');

    const results = {};

    for (const loc of [...new Set(sites.StopAndShop.locations)]) {
        if (!results[loc.zip]) {
            await page.evaluate(
                () => (document.getElementById("zip-input").value = "")
            );
            await page.type("#zip-input", loc.zip);
            const [searchResponse, ...rest] = await Promise.all([
                Promise.race([
                    page.waitForResponse(
                        // TODO - this link doesn't work for me... fix? 
                        "https://stopandshopsched.rxtouch.com/rbssched/program/covid19/Patient/CheckZipCode"
                    ),
                    page.waitForNavigation(),
                ]),
                page.click("#btnGo"),
            ]);
	  console.log(searchResponse);
	  console.log("tj");
	  console.log(rest);
            const result = (await searchResponse.buffer()).toString();
            //if there's something available, log it with a unique name so we can check it out l8r g8r
            if (result.indexOf(noAppointmentMatchString) == -1) {
                let today = new Date();
                today =
                    today.getFullYear() +
                    "-" +
                    (today.getMonth() + 1) +
                    "-" +
                    today.getDate();
                const filename =
                    "stopandshop-zip-" + loc.zip + "-date-" + today + ".png";
                await page.screenshot({ path: filename });
            }
          results[loc.zip] = result;
        }
    }

    return results;
}