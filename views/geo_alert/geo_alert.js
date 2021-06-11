describe('Appliance softAp_Transactions page', () =>{
    it('Appliance softAp_Transactions page testing', () =>{
    cy.visit('/login')
    .contains('Login')
//login
 cy.get('[id="emailIdInput"]').should('be.visible').should('be.enabled').type('mahantesha@cloudmpower.com')
 cy.get('[id="pwdIdInput"]').should('be.visible').should('be.enabled').type('CloudMPower')
 cy.get('#signinButton').click()
 cy.wait(1000) 

//Setings
cy.get('[class="homeTableBorderBottom"]')
  .contains('settings').click()
cy.wait(500)

//geo alert
cy.get('[href="#tab-4"]').find('i').contains('location_on').click()

// cy.contains('set Alert Location').click()

cy.get('img[alt="Google Maps"]').click({force: true})
cy.wait(1000)
cy.get('[id="goToApplLoc"]').contains('location_on').click({force: true})
cy.wait(1000)
cy.get('[id="goToAlertLoc"]').contains('location_on').click({force: true})
cy.wait(1000)
cy.get('[id="SaveAlert"]').contains('Save').click({force: true})


})

})

