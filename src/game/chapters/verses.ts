import type { Verse } from "./types";

/**
 * Tulsidas, Ramcharitmanas, Sundarkand. Devanagari text was checked line-by-line
 * against two Gita Press-derived sources (drikpanchang.com and
 * shrirammitramandal.com) on 2026-09-15. Chaupai refs use the Gita Press convention
 * "N.M" = M-th chaupai after doha N−1. Transliteration is IAST-style; meanings are
 * short renderings, not literal glosses.
 */
export const VERSES = {
  /** The leap from Mahendra — chaupais before doha 1. */
  launch: {
    ref: "चौपाई 1.5–1.6",
    devanagari:
      "सिंधु तीर एक भूधर सुंदर। कौतुक कूदि चढ़ेउ ता ऊपर॥\nबार-बार रघुबीर सँभारी। तरकेउ पवनतनय बल भारी॥",
    transliteration:
      "Sindhu tīra eka bhūdhara sundara, kautuka kūdi caṛheu tā ūpara;\nbāra-bāra Raghubīra sam̐bhārī, tarakeu Pavanatanaya bala bhārī.",
    meaning:
      "On the shore stood a lovely mountain; in play he bounded to its top. Remembering Raghubir again and again, the mighty son of the Wind leapt.",
    verified: true,
  },
  mainaka: {
    ref: "दोहा 1",
    devanagari: "हनूमान तेहि परसा कर पुनि कीन्ह प्रनाम।\nराम काजु कीन्हें बिनु मोहि कहाँ बिश्राम॥",
    transliteration:
      "Hanūmāna tehi parasā kara puni kīnha pranāma,\nRāma kāju kīnhe binu mohi kahām̐ biśrāma.",
    meaning:
      'Hanuman touched Mainaka with his hand and bowed: "Until Ram\'s work is done, where is rest for me?"',
    verified: true,
  },
  surasa: {
    ref: "चौपाई 2.9–2.10",
    devanagari:
      "जस जस सुरसा बदनु बढ़ावा। तासु दून कपि रूप देखावा॥\nसत जोजन तेहिं आनन कीन्हा। अति लघु रूप पवनसुत लीन्हा॥",
    transliteration:
      "Jasa jasa Surasā badanu baṛhāvā, tāsu dūna kapi rūpa dekhāvā;\nsata jojana tehiṁ ānana kīnhā, ati laghu rūpa Pavanasuta līnhā.",
    meaning:
      "As Surasa widened her mouth, Hanuman showed a form twice as large; when she stretched it a hundred yojanas, the son of the Wind became very small.",
    verified: true,
  },
  simhika: {
    ref: "चौपाई 3.4–3.5",
    devanagari:
      "सोइ छल हनूमान कहँ कीन्हा। तासु कपटु कपि तुरतहिं चीन्हा॥\nताहि मारि मारुतसुत बीरा। बारिधि पार गयउ मतिधीरा॥",
    transliteration:
      "Soi chala Hanūmāna kaham̐ kīnhā, tāsu kapaṭu kapi turatahiṁ cīnhā;\ntāhi māri Mārutasuta bīrā, bāridhi pāra gayau matidhīrā.",
    meaning:
      "She tried the same trick on Hanuman; he saw through her deceit at once. Slaying her, the brave son of the Wind, steady of mind, crossed the ocean.",
    verified: true,
  },
  lankini: {
    ref: "चौपाई 4.4–4.5",
    devanagari:
      "मुठिका एक महा कपि हनी। रुधिर बमत धरनीं ढनमनी॥\nपुनि संभारि उठी सो लंका। जोरि पानि कर बिनय ससंका॥",
    transliteration:
      "Muṭhikā eka mahā kapi hanī, rudhira bamata dharanīṁ ḍhanamanī;\npuni sambhāri uṭhī so Laṅkā, jori pāni kara binaya sasaṅkā.",
    meaning:
      "The great monkey struck her one blow with his fist and she rolled on the ground spitting blood. Lankini gathered herself, rose, and with folded hands pleaded in fear.",
    verified: true,
  },
  ring: {
    ref: "सोरठा 12 · चौपाई 13.1",
    devanagari:
      "कपि करि हृदयँ बिचार दीन्हि मुद्रिका डारि तब।\nजनु असोक अंगार दीन्ह हरषि उठि कर गहेउ॥\nतब देखी मुद्रिका मनोहर। राम नाम अंकित अति सुंदर॥",
    transliteration:
      "Kapi kari hṛdayam̐ bicāra dīnhi mudrikā ḍāri taba,\njanu Asoka aṅgāra dīnha haraṣi uṭhi kara gaheu.\nTaba dekhī mudrikā manohara, Rāma nāma aṅkita ati sundara.",
    meaning:
      "Having thought it over, Hanuman dropped the ring — as if the Ashoka tree had given her a burning ember; she rose in joy and took it in her hand. Then she saw the lovely ring, beautifully engraved with the name of Ram.",
    verified: true,
  },
  dahan: {
    ref: "दोहा 25 · चौपाई 26.1",
    devanagari:
      "हरि प्रेरित तेहि अवसर चले मरुत उनचास।\nअट्टहास करि गर्जा कपि बढ़ि लाग अकास॥\nदेह बिसाल परम हरुआई। मंदिर तें मंदिर चढ़ धाई॥",
    transliteration:
      "Hari prerita tehi avasara cale maruta unacāsa,\naṭṭahāsa kari garjā kapi baṛhi lāga akāsa.\nDeha bisāla parama haruāī, mandira teṁ mandira caṛha dhāī.",
    meaning:
      "At Hari's bidding the forty-nine winds began to blow; the monkey roared with laughter and grew till he touched the sky. Huge in body yet utterly light, he ran from palace to palace.",
    verified: true,
  },
  chudamani: {
    ref: "चौपाई 27.1–27.2",
    devanagari:
      "मातु मोहि दीजे कछु चीन्हा। जैसें रघुनायक मोहि दीन्हा॥\nचूड़ामनि उतारि तब दयऊ। हरष समेत पवनसुत लयऊ॥",
    transliteration:
      "Mātu mohi dīje kachu cīnhā, jaiseṁ Raghunāyaka mohi dīnhā;\ncūṛāmani utāri taba dayaū, haraṣa sameta Pavanasuta layaū.",
    meaning:
      '"Mother, give me some token, as the lord of the Raghus gave me." She took off her crest-jewel and gave it; the son of the Wind received it with joy.',
    verified: true,
  },
  ram: {
    ref: "चौपाई 32.5–32.6",
    devanagari:
      "सुनु कपि तोहि समान उपकारी। नहिं कोउ सुर नर मुनि तनुधारी॥\nप्रति उपकार करौं का तोरा। सनमुख होइ न सकत मन मोरा॥",
    transliteration:
      "Sunu kapi tohi samāna upakārī, nahiṁ kou sura nara muni tanudhārī;\nprati upakāra karauṁ kā torā, sanamukha hoi na sakata mana morā.",
    meaning:
      '"Listen, Hanuman: no god, human, or sage in a body has done me a service like yours. How could I repay you? My mind cannot even face you."',
    verified: true,
  },
} as const satisfies Record<string, Verse>;

export type VerseKey = keyof typeof VERSES;
