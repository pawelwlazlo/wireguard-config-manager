### Main Problem

Manual distribution of WireGuard configurations to users in the company. Additionally, the need to keep records of issued configurations.

### Minimum Feature Set
- The application should read WireGuard configurations from a specified directory
- Users should be able to download WireGuard configurations
- Users should be able to register and log in to the system
- First registered user becomes an administrator
- Administrator should be able to set the maximum number of peers for a given user
- Administrator should be able to display the list of peers and users assigned to users
- Administrator should be able to display the list of users

### What is NOT included in MVP scope
- Automatic generation of WireGuard configurations for new users, the system only distributes previously created configurations
- Management of hostnames for peers
- Full user management (creating, editing, deleting accounts)
- Full peer management (creating, editing, deleting configurations)

### Success Criteria

1. **Distribution Automation**
   - Users can independently download their assigned WireGuard configurations without contacting an administrator
   - Reduce configuration issuance time from >15 minutes (manual) to <2 minutes (self-service)

2. **Complete Records**
   - System registers all peer assignments to users
   - Administrator has insight into history: who, when, and which configuration was downloaded
   - No "loss" of information about issued configurations

3. **Access Control**
   - Users can download only configurations assigned to them
   - Administrator can manage limits and assignments through web interface
   - System enforces login before accessing configurations

4. **Stability and Usability**
   - Application correctly reads all configurations from directory
   - Interface is intuitive (user can download configuration without instructions)
   - No critical errors preventing basic functions