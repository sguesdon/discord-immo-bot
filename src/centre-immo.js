const
    db = require('node-localdb'),
    ciAds = db('resource/db/centre-immo.json'),
    EventEmitter = require('events').EventEmitter,
    schedule = require('node-schedule'),
    parser = require('node-html-parser').parse,
    request = require('request-promise-native');


module.exports = class CentreImmo extends EventEmitter {

    constructor(cronPattern = '0 */1 * * *') {
        super();
        this.host = 'http://www.centreimmo.com';
        this.job = schedule.scheduleJob(cronPattern, this.checkNewAds.bind(this));
    }

    search(pageNumber = 1, ads = []) {
        return new Promise((resolve, reject) => {
            request({
                method: 'POST',
                uri: `${this.host}/annonces_immobilieres.html`,
                formData: {
                    scene: 'rechercheAnnonce',
                    codem: 'immo',
                    uidRecherche: '',
                    type_r: 'classique',
                    hideCartouche: 'true',
                    rubAction: 0,
                    uidRubrique: 770,
                    commune: 19364,
                    quartier: -1,
                    codePostal: '',
                    prixMin: '',
                    prixMax: 175000,
                    elargirZone: 'ZERO',
                    withPhoto: '',
                    withPhoto_checkbox: 'on',
                    onSubmit: '',
                    surfHabMin: '',
                    nbPiecesMin: '',
                    surfTerMin: '',
                    withStationnement: '',
                    withBalconOrTerrasse: '',
                    pageNumber,
                    tri: ''
                }
            })
            .then((content) => {

                let currentAds = [];
                const body = parser(content);
                for(const ad of body.querySelectorAll('div.ad.annonceLine')) {

                    let url = ad.querySelector('a.titre-annonce').attributes.href,
                        image = ad.querySelector('div.image-ad img').attributes.src,
                        title = ad.querySelector('h1.annonce').text.replace(/\n\t\r/g, ''),
                        id = parseInt(url.replace(/^.+?(\d+?)\.html.+?$/, '$1'));

                    url = `${this.host}${url}`;
                    image = `${this.host}${image}`;
                    currentAds.push({id, url, image, title})
                }

                if(currentAds.length > 0) {
                    ads = ads.concat(currentAds);
                    this.search(pageNumber + 1, ads).then(resolve).catch(reject);
                } else {
                    resolve(ads);
                }

            })
            .catch(reject)
        });
    }

    checkNewAd(ad) {
        return new Promise((resolve, reject) => {
            ciAds.findOne({id: ad.id})
            .then((elt) => {
                if(!elt) {
                    this.emit('newAd', ad);
                    return ciAds.insert(ad);
                } else {
                    return Promise.resolve(false);
                }
            })
            .then(resolve)
            .catch(reject);
        });
    }

    checkNewAds() {
        console.info((new Date()).toString(), 'checking new centre-immo ads');
        this.search()
        .then((ads) => Promise.all(ads.map(this.checkNewAd.bind(this))))
        .then((ads) => ads.filter((ad) => ad))
        .catch((err) => console.error(err))
    }
}
