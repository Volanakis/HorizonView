<script lang="ts">
  import { settings } from '$lib/i18n.svelte';

  // Describes what the code actually does today. Update it whenever data handling changes.
  const REPO = 'https://github.com/Volanakis/HorizonView';
</script>

<svelte:head><title>{settings.lang === 'el' ? 'Ενημέρωση απορρήτου' : 'Privacy notice'} · HorizonView</title></svelte:head>

<article class="page prose">
  {#if settings.lang === 'el'}
    <h1>Ενημέρωση απορρήτου</h1>
    <p class="muted small">Τελευταία ενημέρωση: 1 Νοεμβρίου 2026</p>

    <h2>Ποιος είναι υπεύθυνος</h2>
    <p>Το HorizonView είναι εκπαιδευτικό έργο. Υπεύθυνος επεξεργασίας είναι ο συντηρητής του έργου. Επικοινωνία μέσω του <a href={REPO}>αποθετηρίου του έργου</a>.</p>

    <h2>Τι συλλέγουμε και γιατί</h2>
    <ul>
      <li><strong>Λογαριασμός:</strong> όνομα χρήστη, ονοματεπώνυμο, email, αριθμός ταυτότητας ή διαβατηρίου, ΑΦΜ, διεύθυνση και, προαιρετικά, τηλέφωνο. Ο κωδικός αποθηκεύεται μόνο ως κρυπτογραφικό hash (bcrypt). Χρειάζονται για τη δημιουργία του λογαριασμού και την έκδοση εισιτηρίων στο όνομά σας (εκτέλεση σύμβασης).</li>
      <li><strong>Κρατήσεις:</strong> πτήση, θέση, κατηγορία, τιμή και ημερομηνία κράτησης (εκτέλεση σύμβασης).</li>
      <li><strong>Αρχείο ασφαλείας:</strong> συνδέσεις, αποτυχημένες συνδέσεις και ενέργειες του προσωπικού καταγράφονται με διεύθυνση IP και τύπο προγράμματος περιήγησης, για την προστασία των λογαριασμών και της υπηρεσίας (έννομο συμφέρον).</li>
    </ul>

    <h2>Cookies και αποθήκευση στη συσκευή</h2>
    <p>Χρησιμοποιούμε μόνο απολύτως απαραίτητα cookies: <code>access_token</code> (15 λεπτά), <code>refresh_token</code> (7 ημέρες) και <code>csrf_token</code> (24 ώρες), για τη σύνδεση και την προστασία από επιθέσεις. Δεν υπάρχουν cookies ανάλυσης ή διαφήμισης. Η γλώσσα και το νόμισμα που επιλέγετε αποθηκεύονται μόνο στον περιηγητή σας.</p>

    <h2>Τρίτα μέρη</h2>
    <p>Για τον καιρό και τις ισοτιμίες, ο διακομιστής ζητά δεδομένα από τις υπηρεσίες Weatherstack και Fixer με βάση την πόλη ή το νόμισμα, χωρίς προσωπικά δεδομένα. Αν ο διαχειριστής ενεργοποιήσει τον έλεγχο στοιχείων κατά την εγγραφή, το email και το τηλέφωνό σας ελέγχονται από τις υπηρεσίες Mailboxlayer και Numverify (apilayer).</p>

    <h2>Πόσο καιρό τα κρατάμε</h2>
    <p>Τα στοιχεία λογαριασμού και κρατήσεων διατηρούνται όσο υπάρχει ο λογαριασμός. Οι εγγραφές του αρχείου ασφαλείας διαγράφονται μετά από 90 ημέρες. Τα ληγμένα tokens σύνδεσης διαγράφονται αυτόματα.</p>

    <h2>Τα δικαιώματά σας</h2>
    <p>Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού, φορητότητας και εναντίωσης. Μπορείτε να διορθώσετε τα στοιχεία σας από τη σελίδα «Λογαριασμός». Για αντίγραφο των δεδομένων σας ή διαγραφή του λογαριασμού, επικοινωνήστε με τον συντηρητή. Μπορείτε επίσης να υποβάλετε καταγγελία στην <a href="https://www.dpa.gr">Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα</a>.</p>
  {:else}
    <h1>Privacy notice</h1>
    <p class="muted small">Last updated: 1 November 2026</p>

    <h2>Who is responsible</h2>
    <p>HorizonView is an educational project. The project maintainer is the data controller. Contact them through the <a href={REPO}>project repository</a>.</p>

    <h2>What we collect and why</h2>
    <ul>
      <li><strong>Account:</strong> username, full name, email, ID or passport number, VAT number, address and, optionally, phone. Your password is stored only as a bcrypt hash. We need these to create your account and issue tickets in your name (performance of a contract).</li>
      <li><strong>Bookings:</strong> flight, seat, class, price and booking date (performance of a contract).</li>
      <li><strong>Security log:</strong> sign-ins, failed sign-ins and staff actions are recorded with IP address and browser type, to protect accounts and the service (legitimate interest).</li>
    </ul>

    <h2>Cookies and device storage</h2>
    <p>We only use strictly necessary cookies: <code>access_token</code> (15 minutes), <code>refresh_token</code> (7 days) and <code>csrf_token</code> (24 hours), for signing in and protection against cross-site attacks. There are no analytics or advertising cookies. Your language and currency choice is stored only in your browser.</p>

    <h2>Third parties</h2>
    <p>For weather and exchange rates, the server asks Weatherstack and Fixer for data by city or currency, without personal data. If the operator turns on registration checks, your email and phone number are verified with Mailboxlayer and Numverify (apilayer).</p>

    <h2>How long we keep it</h2>
    <p>Account and booking data is kept while your account exists. Security log entries are deleted after 90 days. Expired sign-in tokens are deleted automatically.</p>

    <h2>Your rights</h2>
    <p>You can access, correct, erase, restrict, port and object to the processing of your data. Correct your details on the Account page. For a copy of your data or to delete your account, contact the maintainer. You can also complain to a data protection authority, in Greece the <a href="https://www.dpa.gr">Hellenic Data Protection Authority</a>.</p>
  {/if}
</article>

<style>
  .prose { max-width: 44rem; gap: 1rem; }
  .prose h2 { margin-top: 1rem; }
  .prose ul { margin: 0; padding-left: 1.25rem; display: grid; gap: 0.5rem; }
  .prose code { font-family: var(--mono); font-size: 0.9em; }
</style>
