// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const gallery = document.getElementById('gallery');
const getImagesButton = document.querySelector('.filters button');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

const spaceFacts = [
	'A day on Venus is longer than its year.',
	'Neutron stars can spin hundreds of times every second.',
	'The footprints left on the Moon can last for millions of years.',
	'Sunlight takes about eight minutes to reach Earth.',
	'Saturn would float in water if you could find a bathtub large enough.'
];

const factSection = document.createElement('section');
factSection.className = 'space-fact';
factSection.setAttribute('aria-label', 'Random space fact');
factSection.innerHTML = '<h2>Did You Know?</h2><p></p>';
factSection.querySelector('p').textContent = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
gallery.before(factSection);

const imageDialog = document.createElement('dialog');
imageDialog.className = 'image-dialog';
imageDialog.setAttribute('aria-label', 'Astronomy picture details');
imageDialog.innerHTML = `
	<button class="dialog-close" type="button" aria-label="Close details">&times;</button>
	<div class="dialog-content"></div>
`;
document.body.append(imageDialog);

imageDialog.querySelector('.dialog-close').addEventListener('click', () => imageDialog.close());
imageDialog.addEventListener('click', (event) => {
	if (event.target === imageDialog) {
		imageDialog.close();
	}
});

function showImageDetails(photo) {
	const content = imageDialog.querySelector('.dialog-content');
	content.replaceChildren();

	const image = document.createElement('img');
	image.src = photo.hdurl;
	image.alt = photo.alt || photo.title;
	image.className = 'dialog-image';

	const title = document.createElement('h2');
	title.textContent = photo.title;

	const date = document.createElement('p');
	date.className = 'photo-date';
	date.textContent = photo.date;

	const explanation = document.createElement('p');
	explanation.className = 'photo-explanation';
	const explanationDocument = new DOMParser().parseFromString(photo.explanation, 'text/html');
	explanation.textContent = explanationDocument.body.textContent;

	content.append(image, title, date, explanation);
	imageDialog.showModal();
}

function displayPhotos(photos) {
	gallery.replaceChildren();

	photos.forEach((photo) => {
		const card = document.createElement('article');
		card.className = 'gallery-item';

		if (photo.media_type === 'image' && photo.hdurl) {
			const openButton = document.createElement('button');
			openButton.className = 'photo-button';
			openButton.type = 'button';
			openButton.setAttribute('aria-label', `View details for ${photo.title}`);

			const image = document.createElement('img');
			image.src = photo.hdurl;
			image.alt = photo.alt || photo.title;
			image.loading = 'lazy';

			openButton.append(image);
			openButton.addEventListener('click', () => showImageDetails(photo));
			card.append(openButton);
		} else {
			const videoLink = document.createElement('a');
			videoLink.className = 'media-thumbnail';
			videoLink.href = photo.permalink || photo.url;
			videoLink.target = '_blank';
			videoLink.rel = 'noopener noreferrer';
			videoLink.setAttribute('aria-label', `Watch ${photo.title} on NASA`);

			if (photo.hdurl) {
				const thumbnail = document.createElement('img');
				thumbnail.src = photo.hdurl;
				thumbnail.alt = photo.alt || `${photo.title} video thumbnail`;
				thumbnail.loading = 'lazy';

				const playIcon = document.createElement('span');
				playIcon.className = 'play-icon';
				playIcon.setAttribute('aria-hidden', 'true');

				videoLink.append(thumbnail, playIcon);
			} else {
				videoLink.classList.add('video-link');
				videoLink.textContent = photo.media_type === 'image' ? 'View on NASA' : 'Watch on NASA';
			}

			card.append(videoLink);
		}

		const title = document.createElement('h2');
		title.textContent = photo.title;

		const date = document.createElement('p');
		date.className = 'photo-date';
		date.textContent = photo.date;

		card.append(title, date);
		gallery.append(card);
	});
}

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate || startDate > endDate) {
		gallery.innerHTML = '<p class="gallery-message">Choose a valid date range.</p>';
		return;
	}

	getImagesButton.disabled = true;
	getImagesButton.textContent = 'Loading...';
	gallery.innerHTML = '<p class="gallery-message" role="status">Loading space photos...</p>';

	const startDateCode = startDate.slice(2).replaceAll('-', '');
	const endDateCode = endDate.slice(2).replaceAll('-', '');

	try {
		const photos = [];
		let pageNumber = 1;
		let totalPages = 1;

		while (pageNumber <= totalPages) {
			const apiUrl = new URL('https://science.nasa.gov/wp-json/wp/v2/apod-basic');
			apiUrl.searchParams.set('date_from', startDateCode);
			apiUrl.searchParams.set('date_to', endDateCode);
			apiUrl.searchParams.set('per_page', '25');
			apiUrl.searchParams.set('page', pageNumber);

			const response = await fetch(apiUrl);

			if (!response.ok) {
				throw new Error(`NASA's APOD feed returned HTTP ${response.status}. Please try again later.`);
			}

			const pagePhotos = await response.json();
			if (!Array.isArray(pagePhotos)) {
				throw new Error('NASA returned an unexpected response. Please try again later.');
			}

			const totalPagesHeader = Number(response.headers.get('X-WP-TotalPages'));
			const totalItemsHeader = Number(response.headers.get('X-WP-Total'));
			if (totalPagesHeader > 0) {
				totalPages = totalPagesHeader;
			} else if (totalItemsHeader > 0) {
				totalPages = Math.ceil(totalItemsHeader / 25);
			} else {
				totalPages = pagePhotos.length === 25 ? pageNumber + 1 : pageNumber;
			}

			photos.push(...pagePhotos);
			pageNumber += 1;
		}

		if (photos.length === 0) {
			gallery.innerHTML = '<p class="gallery-message">No space photos were found for those dates.</p>';
		} else {
			displayPhotos(photos);
		}
	} catch (error) {
		gallery.innerHTML = `<p class="gallery-message" role="alert">${error.message}</p>`;
	} finally {
		getImagesButton.disabled = false;
		getImagesButton.textContent = 'Get Space Images';
	}
}

getImagesButton.addEventListener('click', getSpaceImages);
