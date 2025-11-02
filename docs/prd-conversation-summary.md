<conversation_summary>  
<decisions>

1. **Configuration:** The system will be configured via a config.yaml file, but the highly-sensitive PEER_CONFIG_ENCRYPTION_KEY will be stored in a separate file, with its *path* referenced in config.yaml.  
2. **Database:** A 3-table schema (Users, Peers, Audit_Log) will be used to store all application state, including encrypted peer private keys.  
3. **Authentication:** Registration will be open but restricted to email addresses matching an AcceptedDomains list in the config. The first user to register with the InitialAdminEmail will be granted Admin rights.  
4. **Password Reset:** Users cannot reset their own passwords. An admin must trigger a "Reset Password" function, which displays a one-time temporary password on the admin's screen for secure out-of-band communication.  
5. **Peer Import:** The import process is admin-triggered. It scans a PeerConfigDirectory, copies config data into the database (marked 'Available'), and leaves the original file in place.  
6. **Peer Assignment:** Users claim peers via a self-service "Get New Peer" button, which assigns the oldest 'Available' peer (FIFO). Admins can also manually assign 'Available' peers to users who are under their limit.  
7. **Peer Revocation:** Revocation is a critical two-part transaction: 1) The original .conf file is moved from the PeerConfigDirectory to the RevokedPeerDirectory, and 2) the peer's status in the database is set to 'Inactive'.  
8. **Triggers for Revocation:** Revocation is triggered by a user "Deleting" their own peer or an admin "Deactivating" a user (which cascades to all their assigned peers).  
9. **User Quotas:** A DefaultPeerLimit is set in the config, but admins can override this limit on a per-user basis.  
10. **Security Boundary:** Administrators can *never* view user private keys or download user configuration files. Their role is limited to metadata management (limits, assignments, status) and revocation.  
11. **File Naming:** Downloaded config files will be named based on the user's "Friendly Name," which is sanitized to only allow lowercase letters, numbers, and dashes.

</decisions>  
<matched_recommendations>

1. **Security:** Storing the PrivateKey encrypted in the database, with the encryption key path-referenced in config.yaml, was adopted as the core security model.  
2. **Resilience:** The recommendation to use a two-part transaction for revocation (file move + DB update) and to roll back the DB change on file system failure was accepted to prevent system de-synchronization.  
3. **Auditability:** The creation of a dedicated Audit_Log table was accepted to directly meet the "Complete Records" success criterion.  
4. **Usability (Admin):** The admin UI for manual assignment will be context-aware, only showing users who are *under* their peer limit, preventing admin error.  
5. **Usability (User):** Peer assignment will be a simple "Get New Peer" button using a FIFO (first-in, first-out) queue, removing the need for users to pick from a list.  
6. **Diagnostics:** A read-only "Configuration" page for admins was accepted as a valuable tool for verifying the system's running state.  
7. Error Handling: The system will show persistent UI errors if critical paths (like the config directories) are missing or have permission errors, rather than failing silently.  
   </matched_recommendations>

<prd_planning_summary>

### **a. Main Functional Requirements**

* **Authentication:**  
  * Users can register with an email from an approved domain.  
  * Users can log in.  
  * Users can change their own password (if they know the current one).  
* **Peer Management (Core Lifecycle):**  
  * **Import:** An admin can trigger a scan of a PeerConfigDirectory to import new, valid peer configs into the database.  
  * **Assignment:** A user can claim an 'Available' peer (FIFO) up to their peer_limit.  
  * **Download:** A user can download their assigned peer configs. The file is regenerated on-the-fly from encrypted data.  
  * **Revocation:** A user can "Delete" (revoke) their own peer.  
* **Administrator Functions:**  
  * **User Management:** Admins can view all users (with search/filters), edit a user's peer_limit, "Deactivate" a user (which revokes all their peers), and "Reset" a user's password (generates a temporary password).  
  * **Peer Management:** Admins can view all peers (with search/filters), "Manually Assign" an 'Available' peer, and "Revoke" any peer.  
  * **System Management:** Admins can trigger the import scan, view the Audit_Log, and view a read-only page of the application's configuration.

### **b. Key User Stories and Usage Paths**

* **User: First-Time Setup**  
  1. As a new user, I want to register for an account using my company email.  
  2. I want to log in and land on a dashboard showing my peer limit.  
  3. I want to click "Get New Peer" and have a config assigned to me instantly.  
  4. I want to give this peer a "Friendly Name" (e.g., "my-laptop").  
  5. I want to download the .conf file so I can set up my VPN.  
* **User: Device Replacement**  
  1. As an existing user, I want to log in to the portal.  
  2. I want to find my "my-laptop" peer in my list and click "Delete" to revoke it, as I lost that device.  
  3. I want to click "Get New Peer" to get a replacement, which my now-available quota allows.  
* **Admin: Employee Onboarding**  
  1. As an admin, I want to ensure the PeerConfigDirectory has available peers.  
  2. I will instruct the new employee to register at the portal.  
  3. If the employee needs more than the default limit, I will find their account in the "User List" and raise their peer_limit.  
* **Admin: Employee Offboarding**  
  1. As an admin, I want to find the departing employee in the "User List."  
  2. I want to click "Deactivate User."  
  3. I expect the system to automatically revoke all of their assigned peers, moving their .conf files to the RevokedPeerDirectory and freeing them from the system.

### **c. Success Criteria and Measurement**

1. **Distribution Automation:**  
   * **Criterion:** Users can self-service from registration to download.  
   * **Measurement:** Track the count of PEER_CLAIM and PEER_DOWNLOAD events in the Audit_Log that are initiated by 'User' roles.  
2. **Time Reduction:**  
   * **Criterion:** Reduce issuance time from >15min to <2min.  
   * **Measurement:** Implement a metric for "Average Time from Registration to First Download" by comparing timestamps in the Users and Audit_Log tables.  
3. **Complete Records:**  
   * **Criterion:** System registers all peer assignments and history.  
   * **Measurement:** The Audit_Log table must exist and successfully capture all critical events (login, claim, download, revoke, limit_change).  
4. **Access Control:**  
   * **Criterion:** Users only get their configs; admins manage limits.  
   * **Measurement:** Enforce peer_limit checks at the API level for all assignment actions. Enforce a hard rule (via code) that admins can never decrypt or download peer configs.  
5. **Stability:**  
   * **Criterion:** No critical errors preventing basic functions.  
   * Measurement: Target and monitor a 99.5% success rate for all core API actions (login, claim, download, revoke).  
     </prd_planning_summary>

<unresolved_issues>

* All items identified during the planning conversation were resolved and have a defined implementation or process for the MVP. There are no outstanding unresolved issues for this scope.  
  </unresolved_issues>  
  </conversation_summary>
