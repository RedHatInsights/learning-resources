

describe('All Learning Resources', () => {

  it('appears in the help menu and the link works', () => {});
  it('appears in search results', () => {});
  it('loads when navigated to', () => {
   cy.visit('/learning-resources');
  });

  it('has the appropriate number of items on the tab', () => {

    cy.intercept('GET', '/api/quickstarts/v1/quickstarts?*').as('getQuickstarts');
    // go to All Learning Resources page
    cy.login();
    cy.visit('/learning-resources');

    // wait until the page has fully loaded with quickstarts data
    cy.wait("@getQuickstarts").then((intercept) => {
      expect(intercept.response.statusCode).to.eq(200)});

    // confirm that 50 items appear on the 'All learning resources' tab
    // Note: An ID would be a better way to locate the element
    cy.get('.pf-v6-c-tabs__item-text').contains('All learning resources').then(elem => {
      console.log(elem.text());
      const tabText = elem.text();
      expect(tabText).to.contain('50');
    })
  });

  it('performs basic filtering by name', () => {});

  it('filters by product family', () => {});

  it('filters by console-wide services', () => {});

  it('filters by content type', () => {});

  it('filters by use case', () => {});

  it('displays bookmarked resources', () => {});

})