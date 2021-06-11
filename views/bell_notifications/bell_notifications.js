

describe('bell notifications page', () =>{
    it('bell notifications testing', () =>{
    cy.viewport(1280,720)
    cy.visit('/login')
    .contains('Login')
    //login
    cy.get('input[type="email"]').should('be.visible').should('be.enabled').type('mahantesha@cloudmpower.com')
    cy.wait(1000)
    cy.get('input[type="password"]').should('be.visible').should('be.enabled').type('CloudMPower')
   
    cy.get('button[ type="submit"]').click()
   
    cy.wait(500)
    
   
   cy.get('.notification').find('svg').click();
   cy.contains('Refresh').click()
   // cy.contains('bell').click()
   // cy.get('button[ type="button"]').contains('Yes').click()
})
})