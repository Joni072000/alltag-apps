// =============================================================
// Fragenkatalog – Elektroniker/-in für Energie- und Gebäudetechnik
// Format: [thema, teil, frage, [richtig, falsch, falsch, falsch], erklärung]
// teil 1 = Stoff für Abschlussprüfung Teil 1, teil 2 = eher Teil 2.
// Die richtige Antwort steht in den Daten immer zuerst und wird
// beim Anzeigen gemischt.
// =============================================================

export const THEMEN = [
  { id: 'grundlagen', name: 'Grundlagen', icon: '⚡', farbe: '#F5C542' },
  { id: 'schutz', name: 'Schutzmaßnahmen', icon: '🛡️', farbe: '#FF7A9A' },
  { id: 'pruefen', name: 'Prüfen & Messen', icon: '📏', farbe: '#5AB8FF' },
  { id: 'install', name: 'Installation', icon: '🔌', farbe: '#3DDC84' },
  { id: 'drehstrom', name: 'Drehstrom & Antriebe', icon: '🔄', farbe: '#FF7A1A' },
  { id: 'steuerung', name: 'Steuerungen', icon: '🎛️', farbe: '#A48BFF' },
  { id: 'gebaeude', name: 'Gebäudetechnik & KNX', icon: '🏠', farbe: '#2EC4B6' },
  { id: 'arbeitsschutz', name: 'Arbeitsschutz', icon: '⛑️', farbe: '#FFB54A' },
  { id: 'wiso', name: 'WiSo', icon: '📘', farbe: '#8C94A6' },
];

const F = [
  // ---------- Grundlagen ----------
  ['grundlagen', 1, 'Wie lautet das ohmsche Gesetz?', ['U = R · I', 'U = R / I', 'P = R · I', 'I = U · R'], 'Spannung = Widerstand × Strom. Umgestellt: I = U / R und R = U / I.'],
  ['grundlagen', 1, 'Ein Widerstand von 46 Ω liegt an 230 V. Welcher Strom fließt?', ['5 A', '0,2 A', '10 A', '2,3 A'], 'I = U / R = 230 V / 46 Ω = 5 A.'],
  ['grundlagen', 1, 'Welche Leistung nimmt ein Verbraucher mit 230 V und 10 A auf (ohmsche Last)?', ['2,3 kW', '23 W', '230 W', '23 kW'], 'P = U · I = 230 V · 10 A = 2300 W = 2,3 kW.'],
  ['grundlagen', 1, 'Drei Widerstände mit je 30 Ω sind parallel geschaltet. Wie groß ist der Ersatzwiderstand?', ['10 Ω', '90 Ω', '30 Ω', '3 Ω'], 'Bei n gleichen parallelen Widerständen gilt R = R₁ / n = 30 Ω / 3 = 10 Ω.'],
  ['grundlagen', 1, 'Was gilt in einer Reihenschaltung?', ['Der Strom ist überall gleich groß', 'Die Spannung ist an jedem Widerstand gleich', 'Der Gesamtwiderstand ist kleiner als der kleinste Einzelwiderstand', 'Die Ströme addieren sich'], 'In der Reihenschaltung fließt überall derselbe Strom, die Teilspannungen addieren sich.'],
  ['grundlagen', 1, 'Was gilt in einer Parallelschaltung?', ['An allen Widerständen liegt dieselbe Spannung', 'Der Strom ist überall gleich', 'Der Gesamtwiderstand ist größer als der größte Einzelwiderstand', 'Die Spannungen addieren sich'], 'Parallel: gleiche Spannung, die Teilströme addieren sich, R_ges ist kleiner als der kleinste Einzelwiderstand.'],
  ['grundlagen', 1, 'Wie berechnet man den Widerstand einer Leitung?', ['R = l / (κ · A)', 'R = κ · A / l', 'R = l · A / κ', 'R = κ / (l · A)'], 'Länge geteilt durch (Leitfähigkeit × Querschnitt). Kupfer: κ ≈ 56 m/(Ω·mm²).'],
  ['grundlagen', 1, 'Welche elektrische Leitfähigkeit κ setzt man für Kupfer üblicherweise an?', ['56 m/(Ω·mm²)', '35 m/(Ω·mm²)', '7 m/(Ω·mm²)', '100 m/(Ω·mm²)'], 'Kupfer ≈ 56, Aluminium ≈ 35 m/(Ω·mm²).'],
  ['grundlagen', 1, 'Wie verhält sich der Widerstand eines Kupferleiters bei steigender Temperatur?', ['Er steigt', 'Er sinkt', 'Er bleibt gleich', 'Er wird null'], 'Metalle sind Kaltleiter (PTC-Verhalten): wärmer = höherer Widerstand.'],
  ['grundlagen', 1, 'Welche Einheit hat die elektrische Arbeit?', ['Kilowattstunde (kWh)', 'Kilowatt (kW)', 'Voltampere (VA)', 'Ampere (A)'], 'W = P · t, also z. B. kW · h = kWh.'],
  ['grundlagen', 1, 'Ein 2-kW-Heizlüfter läuft 3 Stunden. Wie viel Energie verbraucht er?', ['6 kWh', '0,67 kWh', '5 kWh', '6 kW'], 'W = P · t = 2 kW · 3 h = 6 kWh.'],
  ['grundlagen', 1, 'Welchen Effektivwert hat die Netzspannung in Deutschland zwischen Außenleiter und Neutralleiter?', ['230 V', '400 V', '325 V', '110 V'], '230 V zwischen L und N, 400 V zwischen zwei Außenleitern. Der Scheitelwert liegt bei ca. 325 V.'],
  ['grundlagen', 1, 'Welche Frequenz hat das öffentliche Stromnetz in Deutschland?', ['50 Hz', '60 Hz', '16,7 Hz', '400 Hz'], '50 Hz – die Spannung wechselt 50-mal pro Sekunde die volle Periode.'],
  ['grundlagen', 1, 'Was beschreibt der Leistungsfaktor cos φ?', ['Verhältnis von Wirkleistung zu Scheinleistung', 'Verhältnis von Blindleistung zu Wirkleistung', 'Den Wirkungsgrad eines Motors', 'Das Verhältnis von Spannung zu Strom'], 'cos φ = P / S. Je näher an 1, desto weniger Blindleistung.'],
  ['grundlagen', 1, 'Was bewirkt ein Kondensator im Wechselstromkreis?', ['Der Strom eilt der Spannung um bis zu 90° voraus', 'Der Strom eilt der Spannung um bis zu 90° nach', 'Strom und Spannung sind immer phasengleich', 'Er sperrt Wechselstrom vollständig'], 'Kapazitiv: Strom eilt vor. Induktiv (Spule): Strom eilt nach.'],
  ['grundlagen', 1, 'Was gibt der Wirkungsgrad η an?', ['Verhältnis von abgegebener zu zugeführter Leistung', 'Verhältnis von zugeführter zu abgegebener Leistung', 'Die Verlustleistung in Watt', 'Den Leistungsfaktor'], 'η = P_ab / P_zu, immer kleiner als 1 (bzw. 100 %).'],
  ['grundlagen', 1, 'Welche Funktion hat eine Diode?', ['Sie lässt Strom nur in eine Richtung durch', 'Sie speichert elektrische Ladung', 'Sie begrenzt den Strom auf einen festen Wert', 'Sie verstärkt Spannungen'], 'Durchlassrichtung Anode → Kathode. Anwendung z. B. im Gleichrichter.'],
  ['grundlagen', 1, 'Welches Übersetzungsverhältnis hat ein Trafo mit 230 V primär und 23 V sekundär?', ['10 : 1', '1 : 10', '230 : 1', '2,3 : 1'], 'ü = U₁ / U₂ = 230 / 23 = 10. Die Ströme verhalten sich umgekehrt.'],

  // ---------- Schutzmaßnahmen ----------
  ['schutz', 1, 'Bis zu welchem Bemessungsfehlerstrom gilt eine RCD als zusätzlicher Schutz?', ['30 mA', '300 mA', '10 mA', '500 mA'], 'Zusätzlicher Schutz nach DIN VDE 0100-410: RCD mit IΔn ≤ 30 mA, z. B. für Steckdosen bis 32 A.'],
  ['schutz', 1, 'Wofür steht die Abkürzung RCD?', ['Fehlerstrom-Schutzeinrichtung', 'Leitungsschutzschalter', 'Überspannungsschutz', 'Brandschutzschalter'], 'Residual Current Device – früher FI-Schalter genannt.'],
  ['schutz', 1, 'Welche Farbe hat der Schutzleiter (PE)?', ['Grün-gelb', 'Blau', 'Braun', 'Schwarz'], 'PE immer grün-gelb, N blau, Außenleiter braun, schwarz oder grau.'],
  ['schutz', 1, 'Welche Farbe hat der Neutralleiter (N)?', ['Blau', 'Grün-gelb', 'Grau', 'Braun'], 'Der Neutralleiter ist hellblau gekennzeichnet.'],
  ['schutz', 1, 'In welchem Netzsystem sind Neutral- und Schutzleiter in der ganzen Anlage getrennt geführt?', ['TN-S-System', 'TN-C-System', 'IT-System', 'TT-System'], 'TN-S: separater N und PE. TN-C: kombinierter PEN-Leiter.'],
  ['schutz', 1, 'Was bedeutet das zweite „T“ im TT-System?', ['Die Körper der Anlage sind direkt geerdet (eigener Anlagenerder)', 'Die Körper sind mit dem Neutralleiter verbunden', 'Das Netz ist isoliert aufgebaut', 'Es gibt einen Transformator'], 'Erster Buchstabe: Erdung der Stromquelle. Zweiter Buchstabe: Körper der Anlage – T = eigener Erder, N = mit dem Neutralleiter verbunden.'],
  ['schutz', 1, 'Was ist der Basisschutz (Schutz gegen direktes Berühren)?', ['Isolierung aktiver Teile, Abdeckungen und Umhüllungen', 'Abschaltung durch den Leitungsschutzschalter', 'Schutzpotenzialausgleich', 'Erdung des Gehäuses'], 'Basisschutz verhindert, dass aktive Teile überhaupt berührt werden können.'],
  ['schutz', 1, 'Welche Abschaltzeit gilt im TN-System für Endstromkreise bis 32 A bei 230 V?', ['0,4 s', '5 s', '0,2 s', '1 s'], 'DIN VDE 0100-410: 0,4 s für Endstromkreise ≤ 32 A im TN-System bei 230 V.'],
  ['schutz', 1, 'Was kennzeichnet ein Gerät der Schutzklasse II?', ['Doppelte oder verstärkte Isolierung, kein Schutzleiteranschluss', 'Anschluss an den Schutzleiter', 'Betrieb mit Schutzkleinspannung', 'Metallgehäuse mit PE'], 'Schutzklasse II = Schutzisolierung (Symbol: zwei ineinanderliegende Quadrate).'],
  ['schutz', 1, 'Was kennzeichnet ein Gerät der Schutzklasse I?', ['Es hat einen Schutzleiteranschluss', 'Es ist doppelt isoliert', 'Es wird mit SELV betrieben', 'Es darf nur im Freien betrieben werden'], 'Schutzklasse I: leitfähiges Gehäuse wird mit dem PE verbunden.'],
  ['schutz', 1, 'Bis zu welcher Wechselspannung spricht man von Kleinspannung (ELV)?', ['50 V AC', '120 V AC', '25 V AC', '230 V AC'], 'Kleinspannung: bis 50 V AC bzw. 120 V DC (oberwellenfrei).'],
  ['schutz', 1, 'Welche Aufgabe hat der Schutzpotenzialausgleich über die Haupterdungsschiene?', ['Er verbindet leitfähige Teile, damit keine gefährlichen Spannungsunterschiede entstehen', 'Er schaltet bei Überlast ab', 'Er begrenzt Überspannungen durch Blitz', 'Er ersetzt den Neutralleiter'], 'Wasser-, Gas-, Heizungsrohre, Fundamenterder und PE werden auf ein Potenzial gebracht.'],
  ['schutz', 1, 'Was schützt ein Leitungsschutzschalter (LS) in erster Linie?', ['Die Leitung vor Überlast und Kurzschluss', 'Personen vor Fehlerströmen', 'Geräte vor Überspannung', 'Die Anlage vor Blitzeinschlag'], 'Thermische Auslösung bei Überlast, magnetische Auslösung bei Kurzschluss.'],
  ['schutz', 1, 'Was bedeutet die Angabe „B16“ auf einem Leitungsschutzschalter?', ['Auslösecharakteristik B, Bemessungsstrom 16 A', 'Baugröße B, 16 mm breit', 'Bemessungsfehlerstrom 16 mA', 'Typ B für Gleichfehlerströme, 16 A'], 'B: magnetische Auslösung bei 3- bis 5-fachem Nennstrom. C: 5- bis 10-fach.'],
  ['schutz', 2, 'Wofür wird ein RCD vom Typ B benötigt?', ['Wenn glatte Gleichfehlerströme auftreten können, z. B. an Wallboxen oder Frequenzumrichtern', 'Für jede normale Steckdose im Wohnbereich', 'Nur für Beleuchtungsstromkreise', 'Als Ersatz für den Leitungsschutzschalter'], 'Typ A erfasst Wechsel- und pulsierende Gleichfehlerströme, Typ B zusätzlich glatte Gleichfehlerströme.'],
  ['schutz', 2, 'Wozu dient ein Brandschutzschalter (AFDD)?', ['Er erkennt Störlichtbögen und schaltet ab', 'Er misst die Raumtemperatur', 'Er ersetzt den RCD', 'Er schützt vor Blitzeinschlag'], 'AFDD = Arc Fault Detection Device, erkennt serielle und parallele Fehlerlichtbögen.'],

  // ---------- Prüfen & Messen ----------
  ['pruefen', 1, 'In welcher Reihenfolge erfolgt die Erstprüfung nach DIN VDE 0100-600?', ['Besichtigen, Erproben und Messen', 'Messen, Besichtigen, Erproben', 'Erproben, Messen, Dokumentieren, Besichtigen', 'Nur Messen'], 'Zuerst Besichtigen (spannungsfrei), dann Erproben und Messen, zum Schluss dokumentieren.'],
  ['pruefen', 1, 'Welcher Isolationswiderstand ist in Stromkreisen bis 500 V mindestens gefordert (Messspannung 500 V DC)?', ['1 MΩ', '0,5 MΩ', '1 kΩ', '100 MΩ'], 'DIN VDE 0100-600: ≥ 1 MΩ bei 500 V DC Messspannung für SELV-fremde Stromkreise bis 500 V.'],
  ['pruefen', 1, 'Wie wird ein Strommesser in den Stromkreis geschaltet?', ['In Reihe zum Verbraucher', 'Parallel zum Verbraucher', 'Zwischen L und PE', 'Parallel zur Spannungsquelle'], 'Strom wird in Reihe gemessen (kleiner Innenwiderstand), Spannung parallel (großer Innenwiderstand).'],
  ['pruefen', 1, 'Wie wird ein Spannungsmesser angeschlossen?', ['Parallel zum Messobjekt', 'In Reihe zum Messobjekt', 'Nur an den Schutzleiter', 'Über einen Stromwandler'], 'Spannungsmesser parallel – mit möglichst hohem Innenwiderstand.'],
  ['pruefen', 1, 'Warum misst man die Schleifenimpedanz?', ['Um nachzuweisen, dass die Schutzeinrichtung im Fehlerfall rechtzeitig abschaltet', 'Um den Isolationszustand zu prüfen', 'Um den Erdungswiderstand eines Blitzableiters zu bestimmen', 'Um die Netzfrequenz zu ermitteln'], 'Aus Zs folgt der Kurzschlussstrom Ik = U₀ / Zs. Er muss den LS rechtzeitig auslösen.'],
  ['pruefen', 1, 'Was wird bei der Durchgängigkeitsprüfung des Schutzleiters gemessen?', ['Ein niederohmiger Widerstand mit mindestens 200 mA Prüfstrom', 'Der Isolationswiderstand mit 500 V', 'Die Netzfrequenz', 'Der Auslösestrom des RCD'], 'Niederohmmessung mit ≥ 200 mA, Leerlaufspannung 4–24 V.'],
  ['pruefen', 1, 'Was muss bei der RCD-Prüfung nachgewiesen werden?', ['Auslösung spätestens bei IΔn und die Berührungsspannung bleibt unter dem zulässigen Wert', 'Dass der RCD bei 10 × IΔn nicht auslöst', 'Nur dass die Prüftaste funktioniert', 'Der Isolationswiderstand des RCD'], 'Prüftaste allein reicht nicht: Auslösestrom, Auslösezeit und Berührungsspannung werden gemessen.'],
  ['pruefen', 1, 'Welche Norm regelt heute die Wiederholungsprüfung ortsveränderlicher Elektrogeräte?', ['DIN EN 50699 (früher DIN VDE 0702)', 'DIN VDE 0100-410', 'DIN VDE 0105-100', 'DIN 18015'], 'Seit 2022 heißt die Norm DIN EN 50678 (nach Instandsetzung) und DIN EN 50699 (Wiederholungsprüfung) – früher DIN VDE 0701-0702.'],
  ['pruefen', 1, 'Was zeigt ein zweipoliger Spannungsprüfer an?', ['Ob zwischen zwei Punkten Spannung anliegt', 'Den genauen Isolationswiderstand', 'Die Schleifenimpedanz', 'Den Leistungsfaktor'], 'Der zweipolige Spannungsprüfer ist das richtige Gerät zum Feststellen der Spannungsfreiheit.'],
  ['pruefen', 1, 'Womit stellt man die Spannungsfreiheit sicher fest?', ['Mit einem zweipoligen Spannungsprüfer, allpolig', 'Mit einem einpoligen Phasenprüfer', 'Durch Abschalten des LS ohne weitere Prüfung', 'Mit einem Multimeter im Strommessbereich'], 'Allpolig mit zweipoligem Spannungsprüfer – der Prüfer vorher und nachher an Spannung testen.'],

  // ---------- Installation ----------
  ['install', 1, 'Mit welcher Schaltung schaltet man eine Lampe von zwei Stellen aus?', ['Wechselschaltung', 'Ausschaltung', 'Serienschaltung', 'Kreuzschaltung allein'], 'Zwei Wechselschalter. Ab drei Stellen kommen Kreuzschalter dazwischen.'],
  ['install', 1, 'Wie viele Kreuzschalter braucht man, um eine Lampe von vier Stellen zu schalten?', ['2', '1', '3', '4'], 'Zwei Wechselschalter außen, dazwischen (n − 2) Kreuzschalter: 4 − 2 = 2.'],
  ['install', 1, 'Was ermöglicht eine Serienschaltung?', ['Zwei Lampen(gruppen) von einer Stelle getrennt schalten', 'Eine Lampe von zwei Stellen schalten', 'Eine Lampe zeitverzögert ausschalten', 'Eine Lampe dimmen'], 'Serienschalter = zwei Ausschalter in einem Gehäuse mit gemeinsamer Zuleitung.'],
  ['install', 1, 'Wann setzt man eine Stromstoßschaltung ein?', ['Wenn eine Lampe von vielen Stellen über Taster geschaltet werden soll', 'Wenn nur ein Schalter vorhanden ist', 'Wenn die Lampe dimmbar sein soll', 'Für Steckdosenstromkreise'], 'Jeder Tastendruck schaltet den Stromstoßschalter um – beliebig viele Taster parallel.'],
  ['install', 1, 'Was bedeutet die Leitungsbezeichnung NYM-J 3×1,5?', ['Mantelleitung mit 3 Adern 1,5 mm², davon eine grün-gelb', 'Erdkabel mit 3 Adern ohne Schutzleiter', 'Flexible Gummischlauchleitung 3 × 1,5 mm²', 'Mantelleitung mit 3 Adern 1,5 mm² ohne grün-gelbe Ader'], '„J“ = mit grün-gelbem Schutzleiter, „O“ = ohne.'],
  ['install', 1, 'Welche Leitung darf direkt ins Erdreich verlegt werden?', ['NYY', 'NYM', 'H07V-U', 'H05VV-F'], 'NYY ist ein Kabel und für die Verlegung in Erde geeignet. NYM nicht.'],
  ['install', 1, 'Was beschreiben Installationszonen nach DIN 18015-3?', ['Bereiche, in denen Leitungen unter Putz verlegt werden dürfen', 'Abstände zwischen Steckdosen', 'Die Höhe von Lichtschaltern', 'Brandabschnitte im Gebäude'], 'Waagerechte und senkrechte Zonen, damit man später beim Bohren keine Leitung trifft.'],
  ['install', 1, 'Welche Funktion hat der Überspannungsschutz Typ 1?', ['Blitzstromableiter am Gebäudeeintritt', 'Feinschutz direkt am Endgerät', 'Fehlerstromschutz', 'Kurzschlussschutz'], 'Typ 1 (Grobschutz) bei äußerem Blitzschutz bzw. Freileitung, Typ 2 im Verteiler, Typ 3 am Gerät.'],
  ['install', 2, 'Was regelt die TAB (Technische Anschlussbedingungen)?', ['Anforderungen des Netzbetreibers an den Anschluss von Kundenanlagen', 'Die Ausbildungsinhalte im Betrieb', 'Tarife für Strom', 'Prüffristen für Elektrowerkzeuge'], 'Die TAB des Netzbetreibers regeln z. B. Zählerplatz, Hausanschluss und Anmeldung von Anlagen.'],
  ['install', 1, 'Wer darf Arbeiten an elektrischen Anlagen durchführen?', ['Elektrofachkräfte oder elektrotechnisch unterwiesene Personen unter Aufsicht', 'Jeder mit geeignetem Werkzeug', 'Nur der Netzbetreiber', 'Nur Meister'], 'DGUV Vorschrift 3: Elektrofachkraft oder unter deren Leitung und Aufsicht.'],

  // ---------- Drehstrom & Antriebe ----------
  ['drehstrom', 1, 'Welche Spannung liegt zwischen zwei Außenleitern im 400/230-V-Netz?', ['400 V', '230 V', '690 V', '325 V'], 'Außenleiterspannung = √3 × Strangspannung = 1,73 × 230 V ≈ 400 V.'],
  ['drehstrom', 1, 'Wie berechnet man die Wirkleistung im Drehstromnetz?', ['P = √3 · U · I · cos φ', 'P = 3 · U · I', 'P = U · I · cos φ', 'P = √2 · U · I'], 'U und I sind hier Außenleitergrößen.'],
  ['drehstrom', 1, 'Welche Spannung liegt bei Sternschaltung an jedem Strang eines Motors am 400-V-Netz?', ['230 V', '400 V', '133 V', '690 V'], 'Stern: U_Strang = U / √3 = 400 V / 1,73 ≈ 230 V.'],
  ['drehstrom', 2, 'Warum verwendet man den Stern-Dreieck-Anlauf?', ['Um den Anlaufstrom zu verringern', 'Um die Drehrichtung umzukehren', 'Um die Drehzahl zu verdoppeln', 'Um Blindleistung zu kompensieren'], 'Im Stern liegt nur 1/√3 der Spannung an – Anlaufstrom und -moment sinken auf etwa ein Drittel.'],
  ['drehstrom', 1, 'Wie ändert man die Drehrichtung eines Drehstrom-Asynchronmotors?', ['Zwei Außenleiter vertauschen', 'Alle drei Außenleiter vertauschen', 'Neutralleiter und Schutzleiter tauschen', 'Die Frequenz halbieren'], 'Tausch zweier Außenleiter kehrt das Drehfeld um.'],
  ['drehstrom', 2, 'Wie groß ist die synchrone Drehzahl eines 4-poligen Motors (2 Polpaare) an 50 Hz?', ['1500 1/min', '3000 1/min', '1000 1/min', '750 1/min'], 'n = f · 60 / p = 50 · 60 / 2 = 1500 1/min. Der Asynchronmotor läuft mit etwas Schlupf darunter.'],
  ['drehstrom', 2, 'Was ist der Schlupf beim Asynchronmotor?', ['Der Unterschied zwischen Drehfeld- und Läuferdrehzahl', 'Die Verlustleistung im Ständer', 'Der Anlaufstrom', 'Das Spiel in den Lagern'], 's = (n_s − n) / n_s. Ohne Schlupf würde kein Strom im Läufer induziert.'],
  ['drehstrom', 2, 'Wozu dient ein Frequenzumrichter?', ['Zur stufenlosen Drehzahlsteuerung von Drehstrommotoren', 'Zur Spannungserhöhung für Leuchten', 'Zum Schutz vor Überspannung', 'Zum Messen der Netzfrequenz'], 'Durch Ändern von Frequenz und Spannung lässt sich die Drehzahl regeln.'],
  ['drehstrom', 1, 'Was schützt ein Motorschutzschalter zusätzlich zum Kurzschlussschutz?', ['Den Motor vor Überlast', 'Personen vor Fehlerströmen', 'Den Motor vor falscher Drehrichtung', 'Die Leitung vor Blitz'], 'Thermischer Überlastauslöser wird auf den Motornennstrom eingestellt.'],

  // ---------- Steuerungen ----------
  ['steuerung', 1, 'Welche logische Verknüpfung entspricht einer Reihenschaltung von Schließern?', ['UND', 'ODER', 'NICHT', 'XOR'], 'Nur wenn beide Kontakte geschlossen sind, fließt Strom → UND.'],
  ['steuerung', 1, 'Welche logische Verknüpfung entspricht einer Parallelschaltung von Schließern?', ['ODER', 'UND', 'NAND', 'NICHT'], 'Ein geschlossener Kontakt reicht → ODER.'],
  ['steuerung', 1, 'Was ist eine Selbsthaltung bei einer Schützschaltung?', ['Ein Hilfskontakt des Schützes überbrückt den Ein-Taster', 'Das Schütz bleibt durch Federkraft eingeschaltet', 'Der Motor läuft nach dem Abschalten nach', 'Ein Zeitrelais hält den Kontakt'], 'Der Schließer des Schützes parallel zum Ein-Taster hält die Spule nach dem Loslassen weiter unter Spannung.'],
  ['steuerung', 1, 'Warum wird der Aus-Taster als Öffner ausgeführt?', ['Damit bei Drahtbruch die Anlage abschaltet (Drahtbruchsicherheit)', 'Weil Öffner billiger sind', 'Damit man ihn leichter findet', 'Weil Schließer nicht für 230 V zugelassen sind'], 'Fail-safe-Prinzip: Ein unterbrochener Steuerstromkreis führt zu Aus.'],
  ['steuerung', 1, 'Was versteht man unter einer Verriegelung bei einer Wendeschützschaltung?', ['Die Schütze können nicht gleichzeitig anziehen', 'Der Motor kann nur in eine Richtung laufen', 'Der Schaltschrank wird abgeschlossen', 'Der Motor startet automatisch'], 'Gegenseitige Öffner verhindern einen Kurzschluss zwischen zwei Außenleitern.'],
  ['steuerung', 2, 'Was ist eine SPS?', ['Speicherprogrammierbare Steuerung', 'Stromschutzsystem', 'Spannungs-Prüf-Station', 'Sicherheits-Prüf-Schalter'], 'Die Logik steckt im Programm statt in der Verdrahtung (z. B. LOGO!, S7).'],
  ['steuerung', 2, 'Was unterscheidet eine Regelung von einer Steuerung?', ['Die Regelung hat einen geschlossenen Wirkungskreis mit Rückführung', 'Die Steuerung misst ständig den Istwert', 'Eine Regelung braucht keinen Sollwert', 'Es gibt keinen Unterschied'], 'Regelung: Istwert wird gemessen und mit dem Sollwert verglichen. Steuerung: offene Wirkungskette.'],
  ['steuerung', 1, 'Mit welchem Kennbuchstaben werden Leistungsschütze nach DIN EN 81346-2 bezeichnet?', ['Q', 'P', 'S', 'F'], 'Nach EN 81346-2: Q = Schalten von Energie (Schütz), S = Taster/Schalter, F = Schutzorgan, P = Meldeleuchte. In älteren Plänen steht für Schütze noch K.'],

  // ---------- Gebäudetechnik & KNX ----------
  ['gebaeude', 2, 'Mit welcher Spannung arbeitet die KNX-Busleitung?', ['30 V DC (SELV)', '230 V AC', '12 V AC', '400 V AC'], 'Die KNX-Spannungsversorgung liefert 30 V DC als Schutzkleinspannung.'],
  ['gebaeude', 2, 'Welche Farben haben die Adern der KNX-Busleitung (z. B. J-Y(St)Y 2×2×0,8)?', ['Rot (+) und Schwarz (−), Reserve Gelb und Weiß', 'Braun und Blau', 'Grün-gelb und Blau', 'Rot und Blau'], 'Rot/Schwarz = Bus, Gelb/Weiß = Reservepaar.'],
  ['gebaeude', 2, 'Was ist eine physikalische Adresse bei KNX?', ['Die eindeutige Adresse eines Geräts nach Bereich.Linie.Teilnehmer', 'Die Adresse für eine Funktion wie „Licht Küche“', 'Die IP-Adresse des Routers', 'Die Seriennummer'], 'Z. B. 1.1.5. Gruppenadressen (z. B. 1/0/1) verknüpfen dagegen Funktionen.'],
  ['gebaeude', 2, 'Welche Software nutzt man zur Programmierung von KNX-Anlagen?', ['ETS', 'TIA Portal', 'AutoCAD', 'LOGO!Soft'], 'ETS = Engineering Tool Software der KNX Association.'],
  ['gebaeude', 2, 'Was ist ein Sensor in einer KNX-Anlage?', ['Ein Gerät, das Befehle sendet, z. B. Taster oder Bewegungsmelder', 'Ein Gerät, das Lasten schaltet', 'Die Spannungsversorgung', 'Die Busleitung'], 'Sensoren senden Telegramme, Aktoren führen Befehle aus (Schaltaktor, Dimmaktor).'],
  ['gebaeude', 1, 'Was regelt die DIN 18015-2?', ['Die Mindestausstattung elektrischer Anlagen in Wohngebäuden', 'Die Prüfung von Elektrogeräten', 'Den Blitzschutz', 'Die Ausbildungsordnung'], 'Sie legt fest, wie viele Steckdosen, Auslässe und Stromkreise eine Wohnung mindestens hat (Ausstattungswerte, vgl. RAL-RG 678).'],
  ['gebaeude', 2, 'Welche Aufgabe hat ein Wechselrichter in einer PV-Anlage?', ['Er wandelt den Gleichstrom der Module in netzkonformen Wechselstrom', 'Er speichert Energie', 'Er schützt vor Blitz', 'Er misst den Eigenverbrauch'], 'Die Module liefern DC, ins Hausnetz und öffentliche Netz wird AC eingespeist.'],
  ['gebaeude', 2, 'Warum braucht eine Wallbox meist eine Anmeldung beim Netzbetreiber?', ['Ladepunkte sind meldepflichtig, über 12 kVA zusätzlich zustimmungspflichtig', 'Weil sie draußen montiert wird', 'Weil sie eine eigene Zählernummer bekommt', 'Das ist nicht nötig'], 'Niederspannungsanschlussverordnung (NAV § 19): Jede Ladeeinrichtung wird gemeldet, über 12 kVA (z. B. 22-kW-Wallbox) muss der Netzbetreiber vorher zustimmen.'],

  // ---------- Arbeitsschutz ----------
  ['arbeitsschutz', 1, 'Was ist die erste der fünf Sicherheitsregeln?', ['Freischalten', 'Erden und kurzschließen', 'Spannungsfreiheit feststellen', 'Benachbarte Teile abdecken'], '1. Freischalten, 2. gegen Wiedereinschalten sichern, 3. Spannungsfreiheit feststellen, 4. Erden und kurzschließen, 5. benachbarte unter Spannung stehende Teile abdecken.'],
  ['arbeitsschutz', 1, 'Welche ist die dritte der fünf Sicherheitsregeln?', ['Spannungsfreiheit feststellen', 'Gegen Wiedereinschalten sichern', 'Freischalten', 'Abdecken'], 'Erst nach dem Sichern wird allpolig die Spannungsfreiheit festgestellt.'],
  ['arbeitsschutz', 1, 'In welcher Reihenfolge werden die fünf Sicherheitsregeln nach der Arbeit aufgehoben?', ['In umgekehrter Reihenfolge', 'In derselben Reihenfolge', 'Beliebig', 'Nur Regel 1 wird rückgängig gemacht'], 'Erst abdecken entfernen, dann Erdung lösen … zuletzt wieder einschalten.'],
  ['arbeitsschutz', 1, 'Ab welchem Strom besteht beim Durchströmen des Körpers mit 50-Hz-Wechselstrom Lebensgefahr durch Herzkammerflimmern?', ['Ab etwa 50 mA', 'Ab etwa 0,5 mA', 'Erst ab 1 A', 'Ab etwa 5 A'], 'Wahrnehmbarkeit ab ca. 0,5 mA, Loslassgrenze ca. 10 mA, ab ca. 50 mA Herzkammerflimmern möglich.'],
  ['arbeitsschutz', 1, 'Was ist bei einem Stromunfall die erste Maßnahme?', ['Stromkreis unterbrechen, ohne sich selbst zu gefährden', 'Die Person sofort anfassen und wegziehen', 'Erst einen Notruf absetzen, dann abwarten', 'Wasser auf die Person gießen'], 'Eigenschutz zuerst: abschalten. Danach Erste Hilfe und Notruf 112. Auch nach scheinbar harmlosen Unfällen zum Arzt.'],
  ['arbeitsschutz', 1, 'Welche Vorschrift regelt Elektrische Anlagen und Betriebsmittel für Unternehmen?', ['DGUV Vorschrift 3', 'BGB § 433', 'DIN 18015', 'Arbeitszeitgesetz'], 'Die DGUV Vorschrift 3 schreibt u. a. regelmäßige Prüfungen vor.'],
  ['arbeitsschutz', 1, 'Was bedeutet ein rundes, blaues Schild mit weißem Symbol?', ['Gebotszeichen', 'Verbotszeichen', 'Warnzeichen', 'Rettungszeichen'], 'Blau/rund = Gebot (z. B. Schutzhelm tragen), rot umrandet = Verbot, gelb/dreieckig = Warnung, grün = Rettung.'],

  // ---------- WiSo ----------
  ['wiso', 1, 'Wie lange darf die Probezeit in der Berufsausbildung höchstens dauern?', ['4 Monate', '6 Monate', '1 Monat', '12 Monate'], 'BBiG § 20: mindestens 1, höchstens 4 Monate.'],
  ['wiso', 1, 'Welches Gesetz regelt die Berufsausbildung in Deutschland?', ['Berufsbildungsgesetz (BBiG)', 'Betriebsverfassungsgesetz', 'Handelsgesetzbuch', 'Arbeitsschutzgesetz'], 'Im Handwerk ergänzt durch die Handwerksordnung (HwO).'],
  ['wiso', 1, 'Wer vertritt die Interessen der Auszubildenden unter 25 im Betrieb?', ['Die Jugend- und Auszubildendenvertretung (JAV)', 'Die Handwerkskammer', 'Der Ausbilder', 'Die Berufsgenossenschaft'], 'Die JAV wird gewählt, wenn ein Betriebsrat besteht und mindestens 5 Jugendliche/Azubis unter 25 beschäftigt sind.'],
  ['wiso', 1, 'Muss das Berichtsheft (Ausbildungsnachweis) geführt werden?', ['Ja, es ist Voraussetzung für die Zulassung zur Abschlussprüfung', 'Nein, es ist freiwillig', 'Nur im ersten Ausbildungsjahr', 'Nur wenn der Betrieb es verlangt'], 'BBiG § 43: Ein ordnungsgemäß geführter Ausbildungsnachweis ist Zulassungsvoraussetzung.'],
  ['wiso', 1, 'Wer ist für Unfälle auf dem Weg zur Arbeit zuständig?', ['Die gesetzliche Unfallversicherung (Berufsgenossenschaft)', 'Die Krankenkasse', 'Der Arbeitgeber persönlich', 'Die Haftpflichtversicherung'], 'Wegeunfälle sind über die Berufsgenossenschaft versichert, Beiträge zahlt allein der Arbeitgeber.'],
  ['wiso', 1, 'Wie kann ein Ausbildungsverhältnis nach der Probezeit vom Azubi gekündigt werden?', ['Mit einer Frist von 4 Wochen, wenn er die Ausbildung aufgeben oder einen anderen Beruf erlernen will', 'Jederzeit fristlos ohne Grund', 'Gar nicht', 'Nur mündlich mit 1 Woche Frist'], 'BBiG § 22. Die Kündigung muss schriftlich mit Angabe des Grundes erfolgen.'],
  ['wiso', 1, 'Welche Sozialversicherung zahlt bei Arbeitslosigkeit?', ['Arbeitslosenversicherung', 'Pflegeversicherung', 'Unfallversicherung', 'Rentenversicherung'], 'Die fünf Säulen: Kranken-, Pflege-, Renten-, Arbeitslosen- und Unfallversicherung.'],
  ['wiso', 1, 'Was regelt ein Tarifvertrag?', ['Arbeitsbedingungen wie Lohn, Urlaub und Arbeitszeit für eine Branche', 'Die Prüfungsordnung der Kammer', 'Die Steuerklasse', 'Die Kündigungsfristen im Mietrecht'], 'Er wird zwischen Gewerkschaft und Arbeitgeberverband ausgehandelt.'],
];

export const FRAGEN = F.map(([thema, teil, frage, antworten, erkl], i) => ({
  id: 'k' + i, thema, teil, frage, richtig: antworten[0], antworten, erkl,
}));

export const thema = (id) => THEMEN.find((t) => t.id === id) || { id, name: id, icon: '📌', farbe: '#8C94A6' };

/** Leitner-Boxen: Box 1 täglich, dann 2, 4, 8, 16 Tage */
export const BOX_TAGE = [0, 1, 2, 4, 8, 16];

/** IHK-Notenschlüssel (100-Punkte-Schlüssel) */
export function noteAusPunkten(p) {
  if (p >= 92) return { note: 1, text: 'sehr gut' };
  if (p >= 81) return { note: 2, text: 'gut' };
  if (p >= 67) return { note: 3, text: 'befriedigend' };
  if (p >= 50) return { note: 4, text: 'ausreichend' };
  if (p >= 30) return { note: 5, text: 'mangelhaft' };
  return { note: 6, text: 'ungenügend' };
}

export function mischen(arr, seed = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(seed() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
