### Główny problem

Manualne wysyłanie konfiguracji WireGuard do użytkowników w firmie. Dodatkowo konieczność ewidencji, wydanych konfiguracji. 

### Najmniejszy zestaw funkcjonalności

- Kontrola dostępu do sieci WireGuard dla użytkowników
- Przypisywanie użytkownikom adresów IP z puli
- Dodawanie, usuwanie użytkowników
- Kontrola ilości peerów per użytkownik
- Usuwanie, blokowanie peerów
- Usuwanie, blokowanie użytkowników


### Co NIE wchodzi w zakres MVP

- Automatyczne tworzenie serwera WireGuard w oparciu o Docker
- Automatyczne generowanie konfiguracji WireGuard dla nowych użytkowników, system tylko dystrybuuje utworzone wcześniej konfiguracje
- Zarządzanie nazwami hostów dla peerów


### Kryteria sukcesu

- Administrator może zarządzać użytkownikami
- Administrator może zarządzać peerami
- Użytkownik może pobierać konfiguracje WireGuard


