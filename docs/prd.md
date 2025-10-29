# **Product Requirements Document (PRD): WireGuard Config Distributor**

## **1\. Overview**

### **1.1. Problem**

The manual distribution of WireGuard configurations to users is time-consuming (15+ minutes per user) and error-prone. There is no central record of which user has which peer configuration, leading to a loss of information and potential security gaps.

### **1.2. Goal**

To create a self-service web application that automates the distribution of pre-generated WireGuard peer configurations. This will reduce configuration issuance time to under 2 minutes, provide a complete audit trail of all peer assignments, and enforce access control.

### **1.3. User Roles**

* **User:** A standard company employee who needs to download WireGuard configurations for their devices.  
* **Administrator:** An IT staff member responsible for managing users, peer limits, and monitoring the system.

## **2\. Core Architecture**

### **2.1. Configuration**

* All application settings will be managed in a single config.yaml file.  
* **Critical Security:** The PEER\_CONFIG\_ENCRYPTION\_KEY used for database encryption will *not* be in config.yaml. Its *path* will be specified in the config file (e.g., EncryptionKeyPath: /etc/app/secret.key), and the key file itself must be secured via file system permissions.  
* **config.yaml Structure:**  
  Database:  
    ConnectionString: "user:pass@host/db\_name"  
  Logging:  
    LogLevel: "Info"  
  Security:  
    AcceptedDomains:  
      \- "company.com"  
      \- "subsidiary.com"  
    EncryptionKeyPath: "/etc/app/secret.key"  
    InitialAdminEmail: "admin@company.com"  
  WireGuard:  
    PeerConfigDirectory: "/etc/wireguard/peers-to-import"  
    RevokedPeerDirectory: "/etc/wireguard/peers-revoked"  
    DefaultPeerLimit: 3

### **2.2. Database Schema**

A 3-table model will be used:

1. **Users**: Stores user\_id, email, password\_hash, role ('User' or 'Admin'), peer\_limit, status ('Active' or 'Deactivated').  
2. **Peers**: Stores peer\_id, status ('Available', 'Assigned', 'Inactive'), assigned\_user\_id (foreign key to Users), ip\_address (parsed), peer\_data (encrypted JSON/blob of all config key-values), import\_timestamp.  
3. **Audit\_Log**: Stores timestamp, actor\_email, action\_type (e.g., 'LOGIN', 'PEER\_CLAIM', 'PEER\_REVOKE'), target\_info (e.g., peer IP, target user email).

### **2.3. Peer Lifecycle (Core System Logic)**

This is the central flow of the application, coordinating the file system and database.

1. **Import:**  
   * Admin navigates to the "Import" page and clicks "Rescan Directory."  
   * The application scans the PeerConfigDirectory.  
   * For each .conf file *not* already in the Peers table:  
     * It validates the file (must be valid WireGuard format).  
     * It parses the file, extracting the Address (IP) as a unique identifier.  
     * It stores all config contents (including PrivateKey) as an encrypted value in the Peers table with status \= 'Available'.  
     * The *original .conf file is left untouched* in the PeerConfigDirectory.  
   * Files with duplicate IPs or invalid formats are skipped and logged in the Import UI.  
2. **Assignment (User Self-Service):**  
   * A user (who is under their peer\_limit) clicks "Get New Peer."  
   * A confirmation modal is shown.  
   * On confirm, the system finds the oldest "Available" peer (FIFO).  
   * The Peers table row is updated: status \= 'Assigned', assigned\_user\_id \= user's ID.  
   * The action is logged in Audit\_Log.  
3. **Download:**  
   * User clicks "Download" on an assigned peer.  
   * The system fetches the encrypted peer\_data from the Peers table.  
   * It decrypts the data and regenerates the .conf file content on the fly.  
   * The downloaded filename is generated from the user's "Friendly Name" (sanitized to lowercase, numbers, and dashes only) or defaults to the peer's IP (e.g., 10-0-0-5.conf).  
   * The action is logged. *Admins can never download user config files.*  
4. **Revocation (Critical):**  
   * Triggered when a user "Deletes" their own peer, or an Admin "Deactivates" a user (which cascades to all their peers).  
   * The system performs two actions as a transaction:  
     1. **File System:** Moves the *original .conf file* from PeerConfigDirectory to RevokedPeerDirectory.  
     2. **Database:** Updates the Peers table row: status \= 'Inactive', assigned\_user\_id \= null.  
   * The action is logged. This ensures the peer is removed from the WireGuard server (which monitors the directory) and the application database simultaneously.

## **3\. User Features (Self-Service)**

### **3.1. Authentication**

* **Registration:** Open registration form, but email *must* match one of the AcceptedDomains from config.yaml.  
* **Login:** Standard email/password login.  
* **Password Reset:** A "My Account" page allows logged-in users to change their own password (requires "Current Password" and "New Password").

### **3.2. User Dashboard (Home Page)**

* **Quota:** Displays current usage (e.g., "Assigned Peers: 2 / 3").  
* **Action:** A "Get New Peer" button (disabled if at quota).  
* **Peer List:** A list of the user's "Assigned" peers. If empty, a message is shown.  
* **List Item Details:** Each peer in the list will show:  
  * **Friendly Name** (editable text field).  
  * **Peer IP** (e.g., 10.0.0.10).  
  * **\[Download .conf\]** button.  
  * **\[Delete\]** button (triggers revocation).

## **4\. Administrator Features**

### **4.1. Admin Dashboard (Home Page)**

* Displays high-level statistics (cached for 5 mins):  
  * Total Active Users  
  * Total Peers (Available)  
  * Total Peers (Assigned)  
  * Total Peers (Inactive/Revoked)  
  * Peers Claimed (Last 7 Days)

### **4.2. User Management**

* **User List Page:**  
  * Search by user email.  
  * Filter by status (\[All\], \[Active\], \[Deactivated\]).  
  * List shows Email, Role, Peer Count, Peer Limit, Status.  
* **User Detail Page:**  
  * Allows admin to edit the user's peer\_limit.  
  * **\[Deactivate User\]** button (triggers revocation for all assigned peers).  
  * **\[Reset Password\]** button (generates a temporary password and displays it *on-screen one time* for the admin to communicate).

### **4.3. Peer Management**

* **Peer List Page:**  
  * Search by Peer IP or User Email.  
  * Filter by status (\[Available\], \[Assigned\], \[Inactive\]).  
  * Allows admin to **\[Manually Assign\]** an "Available" peer (modal shows a list of *active users who are under their peer limit*).  
  * Allows admin to **\[Revoke\]** any "Available" or "Assigned" peer.

### **4.4. System Management**

* **Import Page:**  
  * Displays the PeerConfigDirectory path (read-only).  
  * **\[Rescan Directory\]** button.  
  * A log box showing results of the last import scan.  
* **Audit Log Page:**  
  * A filterable, paginated table of all events from the Audit\_Log.  
* **Configuration Page:**  
  * A read-only view of *non-secret* values from config.yaml (e.g., AcceptedDomains, DefaultPeerLimit, PeerConfigDirectory).

## **5\. Error Handling & Edge Cases**

* **File System Failure:** If a revocation fails (e.g., file permissions, RevokedPeerDirectory missing), the database action is *rolled back* and the user/admin sees a "Critical Error."  
* **Missing Source File:** If a peer is revoked but the .conf file is already missing, the system *proceeds* to mark the DB as 'Inactive' and logs a warning.  
* **Invalid Config Paths:** If PeerConfigDirectory or RevokedPeerDirectory are missing on startup or scan, a persistent error is shown in the admin UI.  
* **Login Errors:** Specific messages for "Invalid email or password," "Account deactivated," and "Domain not permitted."  
* **First Admin:** The InitialAdminEmail from the config file is checked *at registration time* to grant the 'Admin' role. If the user registers first, their role must be set manually in the database.

## **6\. Success Criteria (Measurable)**

1. **Distribution Automation:** Users can register, log in, and download a config without admin help. (Measured by Audit\_Log events).  
2. **Time Reduction:** "Average Time from Registration to First Download" metric will be tracked and displayed.  
3. **Complete Records:** The Audit\_Log table provides a complete history of all peer assignments and revocations.  
4. **Access Control:** Login is enforced. Peer limits are enforced. Admins *cannot* view private keys or download user configs.  
5. **Stability & Usability:** Target 99.5% success rate for all core user actions (login, claim, download).