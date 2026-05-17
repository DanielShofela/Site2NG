# Security Specification - CVLM CRM

## 1. Data Invariants
- **User profiles**: Each user must have a unique profile at `/users/{userId}` where `{userId}` matches their Auth UID.
- **Job listings**: Only users with the `recruiter` role can create jobs.
- **Job listings ownership**: Each job document must store the `recruiterId` of the creator.
- **Applications**: Only users with the `candidate` role can apply.
- **Application relations**: An application must link to a valid `jobId` and `recruiterId`.
- **Visibility**:
    - Jobs are public (or searchable by all authenticated users).
    - Applications are private to the candidate and the targeted recruiter.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Candidate A tries to create a job listing with Recruiter B's ID.
2. **Role Escalation**: Candidate A tries to update their own role to 'admin'.
3. **Ghost Application**: Candidate A tries to apply to a non-existent job.
4. **Data Injection**: User tries to insert a 2MB string into `companyName`.
5. **Unauthorized Read**: Candidate A tries to read Candidate B's application.
6. **Bypassing Invariant**: Recruiter tries to create a job without a title.
7. **Cross-User Update**: User A tries to update User B's profile.
8. **Malicious Application**: Recruiter tries to apply to their own job.
9. **Status Manipulation**: Candidate tries to set their application status to 'shortlisted'.
10. **Resource Exhaustion**: User tries to create 10,000 jobs in a second (rate limiting is hard in rules alone, but we enforce `createdAt` logic).
11. **Shadow Field**: User adds `isSystemAdmin: true` to their user profile.
12. **Orphaned Writes**: User deletes their profile but leaves active jobs.

## 3. Implementation Plan
- Partition `users` by UID.
- Use `get()` to verify roles for cross-collection writes.
- Enforce strict schemas using `isValid[Entity]` helpers.
- Use `affectedKeys().hasOnly()` for all updates.
