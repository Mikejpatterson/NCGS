/* ----- Ready-made courses -----
   Course cards the organiser can add with one tap instead of typing 18 pars and indexes and the tee ratings.
   Each card is checked against public sources before it goes in; how, and how sure, is in docs/courses/.
   A printed club card always wins: the organiser can still edit every number afterwards. */
const COURSE_LIBRARY = [
  // Athenry (Galway), checked 27 October 2026: docs/courses/ATHENRY.md. Par and stroke index certain (club's own
  // guide); White and Green ratings agree across sources to within a point of slope.
  {"id": "athenry", "name": "Athenry", "area": "Galway", "about": "Parkland course at Palmerstown, between Athenry and Oranmore. Par 70: two par 5s, twelve par 4s and four par 3s. The 7th (413 m) is stroke index 1; the 12th is the signature hole.", "tees": {"white": {"name": "White", "slope": 124, "rating": 71.2, "par": 70}, "green": {"name": "Green", "slope": 117, "rating": 69.2, "par": 70}}, "holes": [{"n": 1, "par": 4, "si": 3, "m": null}, {"n": 2, "par": 4, "si": 7, "m": null}, {"n": 3, "par": 3, "si": 17, "m": null}, {"n": 4, "par": 4, "si": 13, "m": null}, {"n": 5, "par": 4, "si": 9, "m": null}, {"n": 6, "par": 3, "si": 15, "m": null}, {"n": 7, "par": 4, "si": 1, "m": null}, {"n": 8, "par": 5, "si": 11, "m": null}, {"n": 9, "par": 4, "si": 5, "m": null}, {"n": 10, "par": 5, "si": 18, "m": null}, {"n": 11, "par": 4, "si": 10, "m": null}, {"n": 12, "par": 3, "si": 12, "m": null}, {"n": 13, "par": 4, "si": 2, "m": null}, {"n": 14, "par": 4, "si": 4, "m": null}, {"n": 15, "par": 4, "si": 6, "m": null}, {"n": 16, "par": 4, "si": 8, "m": null}, {"n": 17, "par": 3, "si": 16, "m": null}, {"n": 18, "par": 4, "si": 14, "m": null}]}
];
const libraryFor = name => COURSE_LIBRARY.find(x => x.name.toLowerCase() === String(name || '').trim().toLowerCase()) || null;
