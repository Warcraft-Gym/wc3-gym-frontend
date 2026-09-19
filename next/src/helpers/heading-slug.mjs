// GitHub's heading slug, because the guide's table of contents links to #slug and marked emits no ids
export const headingSlug = (text) => text.toLowerCase().trim().replace(/[^\w\- ]+/g, '').replace(/ /g, '-');
