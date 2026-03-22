import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Cheggie Studios database...");

  // ---------------------------------------------------------------------------
  // Users
  // ---------------------------------------------------------------------------

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cheggiestudios.com" },
    update: {},
    create: {
      email: "admin@cheggiestudios.com",
      name: "Cheggie Admin",
      locale: "sr-Latn",
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@cheggiestudios.com" },
    update: {},
    create: {
      email: "demo@cheggiestudios.com",
      name: "Marko Jovanović",
      locale: "sr-Latn",
      role: "USER",
      emailVerified: new Date(),
    },
  });

  console.log(`Created users: ${adminUser.email}, ${demoUser.email}`);

  // ---------------------------------------------------------------------------
  // Workspace
  // ---------------------------------------------------------------------------

  const workspace = await prisma.workspace.upsert({
    where: { id: "workspace-marko-finance" },
    update: {},
    create: {
      id: "workspace-marko-finance",
      name: "Marko Finance Studio",
      ownerId: demoUser.id,
      plan: "PRO",
    },
  });

  // Add demo user as OWNER member and admin as EDITOR
  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: demoUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: demoUser.id,
      role: "OWNER",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: adminUser.id,
      },
    },
    update: {},
    create: {
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: "EDITOR",
    },
  });

  console.log(`Created workspace: ${workspace.name}`);

  // ---------------------------------------------------------------------------
  // Project 1: Bitcoin Analiza Q1 2026
  // ---------------------------------------------------------------------------

  const project1 = await prisma.project.upsert({
    where: { id: "project-bitcoin-analiza-q1-2026" },
    update: {},
    create: {
      id: "project-bitcoin-analiza-q1-2026",
      title: "Bitcoin Analiza Q1 2026",
      description:
        "Detaljna analiza kretanja Bitcoin cene u prvom kvartalu 2026. godine sa osvrtom na makroekonomske faktore i predviđanja za naredni period.",
      userId: demoUser.id,
      workspaceId: workspace.id,
      status: "READY",
      sourceFileName: "bitcoin-analiza-q1-2026.mp4",
      sourceFileMime: "video/mp4",
      sourceFileSizeBytes: 524288000,
      durationMs: 1245000,
      language: "sr",
      tags: ["bitcoin", "kripto", "analiza", "2026", "investiranje"],
      transcriptStatus: "READY",
      searchStatus: "READY",
      subtitleStatus: "READY",
      exportStatus: "READY",
      thumbnailUrl: "https://cdn.cheggiestudios.com/thumbnails/bitcoin-analiza-q1-2026.jpg",
      metadata: {
        resolution: "1920x1080",
        fps: 30,
        codec: "h264",
        audioChannels: 2,
        uploadedAt: "2026-01-15T09:00:00Z",
      },
    },
  });

  // Transcript for Project 1
  const transcript1 = await prisma.transcript.upsert({
    where: { projectId: project1.id },
    update: {},
    create: {
      projectId: project1.id,
      language: "sr",
      rawText: `Dobrodošli u našu detaljnu analizu Bitcoin tržišta za prvi kvartal 2026. godine. Bitcoin je danas dostigao novu vrednost od pedeset hiljada dolara, što predstavlja rast od deset posto u poslednjoj nedelji. Ovaj rast je potaknut povećanim institucionalnim interesom i pozitivnim makroekonomskim signalima iz Sjedinjenih Američkih Država. Federalne rezerve su najavile pauzu u podizanju kamatnih stopa, što je dodatno ohrabrilo investitore da se okrenu rizičnijim sredstvima poput kriptovaluta. Analizom tehničkih indikatora možemo videti da je Bitcoin probio ključni nivo otpora na četrdeset osam hiljada dolara, što otvara prostor za dalji rast prema ciljanoj vrednosti od šezdeset hiljada dolara. Relativna snaga indeksa pokazuje vrednost od sedamdeset dva, što ukazuje na jak trend ali i na potencijalnu pregrejnost tržišta. Volumen trgovanja je porastao za dvadeset pet posto u odnosu na prošlu nedelju, što potvrđuje jačinu ovog pokreta. Preporučujemo oprez i postavljanje stop-loss naloga na nivou od četrdeset pet hiljada dolara kako bi zaštitili potencijalne dobitke.`,
      wordCount: 147,
      durationMs: 1245000,
      status: "READY",
      engineUsed: "whisper-large-v3",
      confidence: 0.94,
      structuredJson: {
        version: "1.0",
        language: "sr",
        segments: 6,
      },
    },
  });

  // Transcript Segments for Project 1
  const seg1p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 0,
      startMs: 0,
      endMs: 12500,
      speaker: "Marko Jovanović",
      text: "Dobrodošli u našu detaljnu analizu Bitcoin tržišta za prvi kvartal 2026. godine.",
      confidence: 0.97,
      keywords: ["bitcoin", "analiza", "tržište", "2026"],
    },
  });

  const seg2p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 1,
      startMs: 12500,
      endMs: 38000,
      speaker: "Marko Jovanović",
      text: "Bitcoin je danas dostigao novu vrednost od pedeset hiljada dolara, što predstavlja rast od deset posto u poslednjoj nedelji.",
      confidence: 0.96,
      keywords: ["bitcoin", "pedeset hiljada dolara", "rast", "deset posto"],
    },
  });

  const seg3p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 2,
      startMs: 38000,
      endMs: 72000,
      speaker: "Marko Jovanović",
      text: "Ovaj rast je potaknut povećanim institucionalnim interesom i pozitivnim makroekonomskim signalima iz Sjedinjenih Američkih Država. Federalne rezerve su najavile pauzu u podizanju kamatnih stopa, što je dodatno ohrabrilo investitore.",
      confidence: 0.93,
      keywords: [
        "institucionalni interes",
        "makroekonomski",
        "Federalne rezerve",
        "kamatne stope",
      ],
    },
  });

  const seg4p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 3,
      startMs: 72000,
      endMs: 112000,
      speaker: "Marko Jovanović",
      text: "Analizom tehničkih indikatora možemo videti da je Bitcoin probio ključni nivo otpora na četrdeset osam hiljada dolara, što otvara prostor za dalji rast prema ciljanoj vrednosti od šezdeset hiljada dolara.",
      confidence: 0.95,
      keywords: [
        "tehnički indikatori",
        "nivo otpora",
        "četrdeset osam hiljada",
        "šezdeset hiljada",
      ],
    },
  });

  const seg5p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 4,
      startMs: 112000,
      endMs: 155000,
      speaker: "Marko Jovanović",
      text: "Relativna snaga indeksa pokazuje vrednost od sedamdeset dva, što ukazuje na jak trend ali i na potencijalnu pregrejnost tržišta. Volumen trgovanja je porastao za dvadeset pet posto u odnosu na prošlu nedelju.",
      confidence: 0.92,
      keywords: [
        "RSI",
        "relativna snaga",
        "sedamdeset dva",
        "volumen trgovanja",
        "dvadeset pet posto",
      ],
    },
  });

  const seg6p1 = await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript1.id,
      index: 5,
      startMs: 155000,
      endMs: 185000,
      speaker: "Marko Jovanović",
      text: "Preporučujemo oprez i postavljanje stop-loss naloga na nivou od četrdeset pet hiljada dolara kako bi zaštitili potencijalne dobitke.",
      confidence: 0.98,
      keywords: [
        "stop-loss",
        "četrdeset pet hiljada dolara",
        "zaštita",
        "dobitci",
      ],
    },
  });

  console.log(`Created transcript with ${6} segments for project 1`);

  // Story for Project 1
  const story1 = await prisma.story.create({
    data: {
      projectId: project1.id,
      title: "Bitcoin Q1 2026 - Ključne tačke",
      status: "READY",
      notes:
        "Izabrani segmenti koji pokrivaju najvažnije aspekte analize: uvod, ključna cena i tehnička analiza.",
    },
  });

  await prisma.storySegment.create({
    data: {
      storyId: story1.id,
      transcriptSegmentId: seg1p1.id,
      position: 0,
      label: "Uvod",
      notes: "Uvodni pozdrav i tema epizode",
    },
  });

  await prisma.storySegment.create({
    data: {
      storyId: story1.id,
      transcriptSegmentId: seg2p1.id,
      position: 1,
      label: "Ključna vest",
      notes: "Najvažniji podatak o ceni",
    },
  });

  await prisma.storySegment.create({
    data: {
      storyId: story1.id,
      transcriptSegmentId: seg4p1.id,
      position: 2,
      label: "Tehnička analiza",
      notes: "Nivoi otpora i ciljane vrednosti",
    },
  });

  console.log(`Created story with 3 story segments for project 1`);

  // Subtitle Asset for Project 1
  await prisma.subtitleAsset.create({
    data: {
      projectId: project1.id,
      format: "SRT",
      language: "sr",
      status: "READY",
      url: "https://cdn.cheggiestudios.com/subtitles/bitcoin-analiza-q1-2026.srt",
      content: `1
00:00:00,000 --> 00:00:12,500
Dobrodošli u našu detaljnu analizu Bitcoin tržišta
za prvi kvartal 2026. godine.

2
00:00:12,500 --> 00:00:38,000
Bitcoin je danas dostigao novu vrednost od pedeset hiljada dolara,
što predstavlja rast od deset posto u poslednjoj nedelji.

3
00:00:38,000 --> 00:01:12,000
Ovaj rast je potaknut povećanim institucionalnim interesom
i pozitivnim makroekonomskim signalima iz SAD.
Federalne rezerve su najavile pauzu u podizanju kamatnih stopa.

4
00:01:12,000 --> 00:01:52,000
Analizom tehničkih indikatora možemo videti da je Bitcoin
probio ključni nivo otpora na četrdeset osam hiljada dolara,
što otvara prostor za dalji rast prema šezdeset hiljada dolara.

5
00:01:52,000 --> 00:02:35,000
Relativna snaga indeksa pokazuje vrednost od sedamdeset dva.
Volumen trgovanja je porastao za dvadeset pet posto.

6
00:02:35,000 --> 00:03:05,000
Preporučujemo oprez i postavljanje stop-loss naloga
na nivou od četrdeset pet hiljada dolara.
`,
    },
  });

  // Export Assets for Project 1
  await prisma.exportAsset.createMany({
    data: [
      {
        projectId: project1.id,
        type: "TRANSCRIPT_TXT",
        url: "https://cdn.cheggiestudios.com/exports/bitcoin-analiza-q1-2026-transcript.txt",
        sizeBytes: 4820,
        status: "READY",
      },
      {
        projectId: project1.id,
        type: "TRANSCRIPT_JSON",
        url: "https://cdn.cheggiestudios.com/exports/bitcoin-analiza-q1-2026-transcript.json",
        sizeBytes: 18340,
        status: "READY",
      },
      {
        projectId: project1.id,
        type: "SUBTITLE_SRT",
        url: "https://cdn.cheggiestudios.com/exports/bitcoin-analiza-q1-2026.srt",
        sizeBytes: 1120,
        status: "READY",
      },
      {
        projectId: project1.id,
        type: "STORY_JSON",
        url: "https://cdn.cheggiestudios.com/exports/bitcoin-analiza-q1-2026-story.json",
        sizeBytes: 6540,
        status: "READY",
      },
      {
        projectId: project1.id,
        type: "METADATA_JSON",
        url: "https://cdn.cheggiestudios.com/exports/bitcoin-analiza-q1-2026-metadata.json",
        sizeBytes: 980,
        status: "READY",
      },
    ],
  });

  console.log(`Created subtitle and export assets for project 1`);

  // Job records for Project 1
  await prisma.jobRecord.createMany({
    data: [
      {
        projectId: project1.id,
        type: "transcript",
        status: "COMPLETED",
        jobId: "bull-transcript-001",
        attempt: 1,
        maxAttempts: 3,
        payload: { engine: "whisper-large-v3", language: "sr" },
        result: { wordCount: 147, confidence: 0.94, durationMs: 1245000 },
        startedAt: new Date("2026-01-15T09:05:00Z"),
        completedAt: new Date("2026-01-15T09:08:32Z"),
      },
      {
        projectId: project1.id,
        type: "subtitle",
        status: "COMPLETED",
        jobId: "bull-subtitle-001",
        attempt: 1,
        maxAttempts: 3,
        payload: { formats: ["SRT"], language: "sr" },
        result: { generated: ["SRT"] },
        startedAt: new Date("2026-01-15T09:09:00Z"),
        completedAt: new Date("2026-01-15T09:09:15Z"),
      },
      {
        projectId: project1.id,
        type: "export",
        status: "COMPLETED",
        jobId: "bull-export-001",
        attempt: 1,
        maxAttempts: 3,
        payload: {
          types: [
            "TRANSCRIPT_TXT",
            "TRANSCRIPT_JSON",
            "SUBTITLE_SRT",
            "STORY_JSON",
            "METADATA_JSON",
          ],
        },
        result: { exported: 5 },
        startedAt: new Date("2026-01-15T09:10:00Z"),
        completedAt: new Date("2026-01-15T09:10:28Z"),
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // Project 2: Intervju: Osnove Investiranja
  // ---------------------------------------------------------------------------

  const project2 = await prisma.project.upsert({
    where: { id: "project-intervju-osnove-investiranja" },
    update: {},
    create: {
      id: "project-intervju-osnove-investiranja",
      title: "Intervju: Osnove Investiranja",
      description:
        "Razgovor sa finansijskim savetnikom Draganom Milovićem o osnovama investiranja za početnike – od akcija i obveznica do kriptovaluta i nekretnina.",
      userId: demoUser.id,
      workspaceId: workspace.id,
      status: "READY",
      sourceFileName: "intervju-osnove-investiranja.mp4",
      sourceFileMime: "video/mp4",
      sourceFileSizeBytes: 312145920,
      durationMs: 864000,
      language: "sr",
      tags: [
        "investiranje",
        "intervju",
        "finansije",
        "početnici",
        "akcije",
        "obveznice",
      ],
      transcriptStatus: "READY",
      searchStatus: "READY",
      subtitleStatus: "READY",
      exportStatus: "PENDING",
      thumbnailUrl:
        "https://cdn.cheggiestudios.com/thumbnails/intervju-osnove-investiranja.jpg",
      metadata: {
        resolution: "1920x1080",
        fps: 25,
        codec: "h264",
        audioChannels: 2,
        uploadedAt: "2026-02-03T14:30:00Z",
        guests: ["Dragan Milović"],
      },
    },
  });

  // Transcript for Project 2
  const transcript2 = await prisma.transcript.upsert({
    where: { projectId: project2.id },
    update: {},
    create: {
      projectId: project2.id,
      language: "sr",
      rawText: `Danas razgovaramo sa Draganom Milovićem, iskusnim finansijskim savetnikom sa više od petnaest godina iskustva u oblasti upravljanja imovinom. Dragan, recite nam, sa čime bi trebalo da počne neko ko želi da počne da investira sa malim budžetom? Ključna stvar je diversifikacija portfelja. Nikada ne treba ulagati sav novac u jednu vrstu imovine. Preporučujem početnicima da razmotre indeksne fondove koji prate tržišne indekse poput S&P petsto, jer nude široku izloženost uz niske naknade upravljanja. Kakav je vaš savet kada je u pitanju kriptovaluta i da li je to pogodna investicija za početnike? Kriptovalute su visokorizična sredstva i preporučujem da nikada ne ulažete više od pet do deset posto ukupnog portfelja u kriptovalute. Bitcoin i Ethereum su najlikvidniji i najstabilniji od svih kriptovaluta, ali i dalje treba biti svestan da su to špekulativna sredstva. Koji je minimalni iznos sa kojim se može početi investirati na srpskom tržištu kapitala? Na Beogradskoj berzi možete početi sa svega deset hiljada dinara, ali realniji početak bi bio sa pedeset do sto hiljada dinara kako biste imali dovoljno za diverzifikaciju između nekoliko kompanija poput NIS-a, Komercijalne banke i Aerodroma Nikola Tesla.`,
      wordCount: 186,
      durationMs: 864000,
      status: "READY",
      engineUsed: "whisper-large-v3",
      confidence: 0.91,
      structuredJson: {
        version: "1.0",
        language: "sr",
        segments: 4,
        speakerCount: 2,
      },
    },
  });

  // Transcript Segments for Project 2
  await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript2.id,
      index: 0,
      startMs: 0,
      endMs: 22000,
      speaker: "Marko Jovanović",
      text: "Danas razgovaramo sa Draganom Milovićem, iskusnim finansijskim savetnikom sa više od petnaest godina iskustva u oblasti upravljanja imovinom.",
      confidence: 0.97,
      keywords: [
        "Dragan Milović",
        "finansijski savetnik",
        "petnaest godina",
        "upravljanje imovinom",
      ],
    },
  });

  await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript2.id,
      index: 1,
      startMs: 22000,
      endMs: 105000,
      speaker: "Dragan Milović",
      text: "Ključna stvar je diversifikacija portfelja. Nikada ne treba ulagati sav novac u jednu vrstu imovine. Preporučujem početnicima da razmotre indeksne fondove koji prate tržišne indekse poput S&P petsto, jer nude široku izloženost uz niske naknade upravljanja.",
      confidence: 0.93,
      keywords: [
        "diversifikacija",
        "portfelj",
        "indeksni fondovi",
        "S&P 500",
        "naknade upravljanja",
      ],
    },
  });

  await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript2.id,
      index: 2,
      startMs: 105000,
      endMs: 215000,
      speaker: "Dragan Milović",
      text: "Kriptovalute su visokorizična sredstva i preporučujem da nikada ne ulažete više od pet do deset posto ukupnog portfelja u kriptovalute. Bitcoin i Ethereum su najlikvidniji i najstabilniji od svih kriptovaluta, ali i dalje treba biti svestan da su to špekulativna sredstva.",
      confidence: 0.9,
      keywords: [
        "kriptovalute",
        "visoki rizik",
        "pet posto",
        "deset posto",
        "Bitcoin",
        "Ethereum",
        "spekulativno",
      ],
    },
  });

  await prisma.transcriptSegment.create({
    data: {
      transcriptId: transcript2.id,
      index: 3,
      startMs: 215000,
      endMs: 320000,
      speaker: "Dragan Milović",
      text: "Na Beogradskoj berzi možete početi sa svega deset hiljada dinara, ali realniji početak bi bio sa pedeset do sto hiljada dinara kako biste imali dovoljno za diverzifikaciju između nekoliko kompanija poput NIS-a, Komercijalne banke i Aerodroma Nikola Tesla.",
      confidence: 0.92,
      keywords: [
        "Beogradska berza",
        "deset hiljada dinara",
        "sto hiljada dinara",
        "NIS",
        "Komercijalna banka",
        "Aerodrom Nikola Tesla",
      ],
    },
  });

  console.log(`Created transcript with ${4} segments for project 2`);

  // Subtitle Asset for Project 2
  await prisma.subtitleAsset.create({
    data: {
      projectId: project2.id,
      format: "SRT",
      language: "sr",
      status: "READY",
      url: "https://cdn.cheggiestudios.com/subtitles/intervju-osnove-investiranja.srt",
      content: `1
00:00:00,000 --> 00:00:22,000
Danas razgovaramo sa Draganom Milovićem,
iskusnim finansijskim savetnikom sa više od 15 godina iskustva.

2
00:00:22,000 --> 00:01:45,000
Ključna stvar je diversifikacija portfelja.
Preporučujem indeksne fondove koji prate S&P 500.

3
00:01:45,000 --> 00:03:35,000
Kriptovalute su visokorizična sredstva.
Ne ulažite više od 5-10% portfelja u kriptovalute.
Bitcoin i Ethereum su najstabilniji izbor.

4
00:03:35,000 --> 00:05:20,000
Na Beogradskoj berzi možete početi sa 10.000 dinara,
ali realniji početak je 50.000 do 100.000 dinara.
`,
    },
  });

  // Job record for Project 2 transcript
  await prisma.jobRecord.createMany({
    data: [
      {
        projectId: project2.id,
        type: "transcript",
        status: "COMPLETED",
        jobId: "bull-transcript-002",
        attempt: 1,
        maxAttempts: 3,
        payload: { engine: "whisper-large-v3", language: "sr" },
        result: { wordCount: 186, confidence: 0.91, durationMs: 864000 },
        startedAt: new Date("2026-02-03T14:35:00Z"),
        completedAt: new Date("2026-02-03T14:38:15Z"),
      },
      {
        projectId: project2.id,
        type: "subtitle",
        status: "COMPLETED",
        jobId: "bull-subtitle-002",
        attempt: 1,
        maxAttempts: 3,
        payload: { formats: ["SRT"], language: "sr" },
        result: { generated: ["SRT"] },
        startedAt: new Date("2026-02-03T14:39:00Z"),
        completedAt: new Date("2026-02-03T14:39:18Z"),
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // Telemetry seed events
  // ---------------------------------------------------------------------------

  await prisma.telemetryEvent.createMany({
    data: [
      {
        userId: demoUser.id,
        projectId: project1.id,
        sessionId: "sess-demo-001",
        type: "project.viewed",
        payload: { page: "project-detail", projectTitle: "Bitcoin Analiza Q1 2026" },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        ip: "93.87.12.45",
      },
      {
        userId: demoUser.id,
        projectId: project1.id,
        sessionId: "sess-demo-001",
        type: "transcript.exported",
        payload: { format: "TRANSCRIPT_TXT" },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        ip: "93.87.12.45",
      },
      {
        userId: demoUser.id,
        projectId: project2.id,
        sessionId: "sess-demo-002",
        type: "project.viewed",
        payload: {
          page: "project-detail",
          projectTitle: "Intervju: Osnove Investiranja",
        },
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        ip: "93.87.12.45",
      },
    ],
  });

  // ---------------------------------------------------------------------------
  // Support issue seed
  // ---------------------------------------------------------------------------

  await prisma.supportIssue.create({
    data: {
      userId: demoUser.id,
      projectId: project1.id,
      category: "FEATURE_REQUEST",
      message:
        "Bilo bi odlično kada bi platforma podržavala automatsko prepoznavanje više govornika u transkriptu i automatsko dodeljivanje names govornika na osnovu prethodnih projekata.",
      context: {
        browser: "Chrome 121",
        os: "macOS 14.2",
        page: "/projects/project-bitcoin-analiza-q1-2026",
      },
      status: "IN_PROGRESS",
    },
  });

  console.log("Seed complete!");
  console.log(`
Summary:
  - Users:             2 (admin + demo)
  - Workspaces:        1 (Marko Finance Studio, PRO plan)
  - Projects:          2
    1. Bitcoin Analiza Q1 2026     – READY, 6 transcript segments, 1 story (3 story segments)
    2. Intervju: Osnove Investiranja – READY, 4 transcript segments
  - Subtitle Assets:   2 (SRT)
  - Export Assets:     5 (for project 1)
  - Job Records:       5
  - Telemetry Events:  3
  - Support Issues:    1
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
