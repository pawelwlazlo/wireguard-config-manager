### Główny problem

Manualne wysyłanie konfiguracji WireGuard do użytkowników w firmie. Dodatkowo konieczność ewidencji, wydanych konfiguracji. 

### Najmniejszy zestaw funkcjonalności
- Aplikacja powinna zaczytać konfiguracje WireGuard z danego katalogu 
- Użytkownik powinien móc pobierać konfiguracje WireGuard
- Użytkownik powinien móc się zarejestrować i zalogować do systemu
- Administrator powinien móc ustawić maksymalną liczbę peeer-ów dla danego użytkownika
- Administrator powinien móc przypisać konkretny peer do użytkownika
- Administrator powinien móc wyświetlić listę peerów przypisanych do użytkownika
- Administrator powinien móc wyświetlić listę użytkowników

### Co NIE wchodzi w zakres MVP
- Automatyczne generowanie konfiguracji WireGuard dla nowych użytkowników, system tylko dystrybuuje utworzone wcześniej konfiguracje
- Zarządzanie nazwami hostów dla peerów
- Zarządzanie użytkownikami
- Zarządzanie peerami

### Kryteria sukcesu

1. **Automatyzacja dystrybucji**
   - Użytkownicy mogą samodzielnie pobrać przypisane im konfiguracje WireGuard bez kontaktu z administratorem
   - Zmniejszenie czasu wydania konfiguracji z >15 minut (ręczne) do <2 minut (samoobsługa)

2. **Pełna ewidencja**
   - System rejestruje wszystkie przypisania peerów do użytkowników
   - Administrator ma wgląd w historię: kto, kiedy i jaką konfigurację pobrał
   - Brak "zgubienia" informacji o wydanych konfiguracjach

3. **Kontrola dostępu**
   - Użytkownicy mogą pobierać tylko przypisane im konfiguracje
   - Administrator może zarządzać limitami i przypisaniami przez interfejs web
   - System wymusza logowanie przed dostępem do konfiguracji

4. **Stabilność i użyteczność**
   - Aplikacja poprawnie zaczytuje wszystkie konfiguracje z katalogu
   - Interface jest intuicyjny (user może pobrać konfigurację bez instrukcji)
   - Brak krytycznych błędów uniemożliwiających podstawowe funkcje
