interface MockSupportCase {
  id: string;
  caseNumber: string;
  summary: string;
  status: string;
  lastModifiedDate: string;
}
export function supportCasesResponse(cases: MockSupportCase[]) {
  return {
    data: {
      redhat_support_uiapi: {
        query: {
          RedHatSupportCase: {
            edges: cases.map((c) => ({
              node: {
                Id: c.id,
                CaseNumber__c: { value: c.caseNumber },
                Subject: { value: c.summary },
                Status: { value: c.status },
                Priority: { value: '3 (Medium)' },
                LastModifiedDate: { value: c.lastModifiedDate },
                LastModifiedBy: null,
              },
            })),
            pageInfo: { hasNextPage: false, endCursor: null },
          },
        },
      },
    },
  };
}
