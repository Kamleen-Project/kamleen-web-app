*** Settings ***
Resource          ../resources/Api.resource
Library           Collections
Suite Setup       API Initialize


*** Test Cases ***
GET /api/experiences returns list payload
    ${json}=    GET JSON    /api/experiences
    Dictionary Should Contain Key    ${json}    experiences
    Dictionary Should Contain Key    ${json}    hasMore
    ${list}=    Get From Dictionary    ${json}    experiences
    Should Be True    isinstance(${list}, list)

GET /api/experiences supports search params
    ${json}=    GET JSON    /api/experiences?q=Tangier&pageSize=3
    ${list}=    Get From Dictionary    ${json}    experiences
    Should Be True    isinstance(${list}, list)
    # Ensure page size cap respected
    ${n}=    Evaluate    len($list)
    Should Be True    ${n} <= 3


