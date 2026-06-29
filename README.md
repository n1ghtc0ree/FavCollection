# CineFlow

A responsive web application for managing a personalized collection of books and movies. The interface utilizes a cinematically styled design layout featuring asymmetric grids, interactive filtering mechanisms, and an automated media asset acquisition fallback system.

## Production URL

The application is deployed and publicly accessible at:
https://favcoll.netlify.app/

## Features

* **Dynamic Taxonomy Filtering:** Runtime processing filters out taxonomy category blocks from the DOM if no corresponding database objects match that specific genre identifier.
* **Automated Asset Ingestion:** Integrated asynchronous fallbacks automatically query the public OMDb API directory to retrieve corresponding graphic poster covers if custom uploads are absent.
* **Persistent Cache Management:** State operations are stored locally on client-side sandboxes via LocalStorage serialization interfaces.
* **Asymmetric Interface Engineering:** Structured CSS positioning using backdrop-filter blur surfaces, dynamic skeleton layout state shimmers, and hardware-accelerated transformation states.

## Tech Stack

* **Structure:** HTML5
* **Style Engine:** CSS3 (Custom Variables, Flexbox, Keyframe Matrices, CSS Grid)
* **Logic Core:** JavaScript (ES6+)
* **External Integrations:** OMDb REST API Engine, Font Awesome 6