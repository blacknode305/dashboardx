// Self-contained, offline-friendly English grammar curriculum for DashboardX.
// Rules use practical teaching generalizations; exceptions are explained in lessons.
// Deliberately no user input or external HTML is interpolated into this data.
export const GRAMMAR_GROUPS = Object.freeze([
  {
    "id": "basics",
    "title": "Основы предложения",
    "lessons": [
      {
        "id": "sentence",
        "level": "A1",
        "title": "Порядок слов",
        "rule": "В обычном утверждении сначала подлежащее, затем сказуемое и дополнение.",
        "formula": "Subject + Verb + Object",
        "example": "She reads books.",
        "translation": "Она читает книги.",
        "mistake": "She books reads — неверный порядок.",
        "quiz": {
          "question": "Как построить простое утверждение?",
          "options": [
            "She reads books.",
            "Reads she books.",
            "She books reads."
          ],
          "answer": 0
        }
      },
      {
        "id": "be",
        "level": "A1",
        "title": "Глагол to be",
        "rule": "В настоящем времени am с I, is с he/she/it, are с you/we/they. Употребляется для состояния и характеристик.",
        "formula": "I am; he is; they are",
        "example": "He is happy.",
        "translation": "Он счастлив.",
        "mistake": "He happy — пропущено is.",
        "quiz": {
          "question": "Выберите верный вариант.",
          "options": [
            "He happy.",
            "He is happy.",
            "He are happy."
          ],
          "answer": 1
        }
      },
      {
        "id": "there",
        "level": "A1",
        "title": "There is / there are",
        "rule": "Для сообщения о наличии используйте there is с единственным числом и there are с множественным.",
        "formula": "There is + singular; There are + plural",
        "example": "There are two chairs.",
        "translation": "Есть два стула.",
        "mistake": "There is two chairs — ошибка согласования.",
        "quiz": {
          "question": "Как сказать «Есть две книги»?",
          "options": [
            "There are two books.",
            "There is two books.",
            "There am two books."
          ],
          "answer": 0
        }
      },
      {
        "id": "have",
        "level": "A1",
        "title": "Have / has",
        "rule": "В Present Simple have употребляется с I/you/we/they, has с he/she/it. В вопросах с does используйте have.",
        "formula": "He has; Does he have?",
        "example": "She has a car.",
        "translation": "У неё есть автомобиль.",
        "mistake": "Does she has — после does нужна форма have.",
        "quiz": {
          "question": "Выберите вопрос.",
          "options": [
            "Does he has a dog?",
            "Does he have a dog?",
            "Do he have a dog?"
          ],
          "answer": 1
        }
      },
      {
        "id": "imperative",
        "level": "A1",
        "title": "Повелительное наклонение",
        "rule": "Команда начинается с начальной формы глагола; для отрицания ставьте Don't.",
        "formula": "Verb!; Don't + verb",
        "example": "Please sit down.",
        "translation": "Пожалуйста, сядьте.",
        "mistake": "You sit down please — возможная фраза, но не нейтральная форма просьбы.",
        "quiz": {
          "question": "Как сказать «Не трогай»?",
          "options": [
            "Not touch!",
            "Doesn't touch!",
            "Don't touch!"
          ],
          "answer": 2
        }
      },
      {
        "id": "questions",
        "level": "A1",
        "title": "Общие вопросы",
        "rule": "С be выносите am/is/are в начало; с обычными глаголами используйте do/does/did перед подлежащим.",
        "formula": "Do/Does + subject + verb?",
        "example": "Do you like coffee?",
        "translation": "Ты любишь кофе?",
        "mistake": "Like you coffee? — неверный порядок.",
        "quiz": {
          "question": "Выберите правильный вопрос.",
          "options": [
            "Do you speak English?",
            "Speak you English?",
            "You do speak English?"
          ],
          "answer": 0
        }
      },
      {
        "id": "negatives",
        "level": "A1",
        "title": "Отрицания",
        "rule": "С be добавляйте not; с обычными глаголами используйте don't/doesn't/didn't + начальная форма.",
        "formula": "Subject + don't/doesn't + verb",
        "example": "He doesn't smoke.",
        "translation": "Он не курит.",
        "mistake": "He doesn't smokes — окончание -s лишнее.",
        "quiz": {
          "question": "Правильное отрицание?",
          "options": [
            "She don't work.",
            "She doesn't work.",
            "She doesn't works."
          ],
          "answer": 1
        }
      },
      {
        "id": "whwords",
        "level": "A1",
        "title": "Вопросительные слова",
        "rule": "Who — кто, what — что, where — где, when — когда, why — почему, how — как. После них обычно идёт вопросительный порядок.",
        "formula": "Wh-word + auxiliary + subject + verb?",
        "example": "Where do you live?",
        "translation": "Где ты живёшь?",
        "mistake": "Where you live? — для обычного Present Simple требуется do.",
        "quiz": {
          "question": "«Почему ты здесь?»",
          "options": [
            "Why you are here?",
            "Why are you here?",
            "Why do you here?"
          ],
          "answer": 1
        }
      },
      {
        "id": "shortanswers",
        "level": "A1",
        "title": "Краткие ответы",
        "rule": "Отвечайте тем же вспомогательным глаголом, который есть в вопросе: Yes, I do; No, she isn't.",
        "formula": "Yes/No + subject + auxiliary",
        "example": "Yes, I do.",
        "translation": "Да.",
        "mistake": "Yes, I like — возможно неполный ответ, но не стандартный краткий ответ.",
        "quiz": {
          "question": "Do you swim? — краткий ответ «да».",
          "options": [
            "Yes, I am.",
            "Yes, I do.",
            "Yes, I have."
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "nouns",
    "title": "Существительные и артикли",
    "lessons": [
      {
        "id": "articles-a",
        "level": "A1",
        "title": "A / an",
        "rule": "Неопределённый артикль употребляется с исчисляемым существительным в единственном числе, когда предмет не определён. An — перед гласным звуком.",
        "formula": "a consonant sound; an vowel sound",
        "example": "An hour is enough.",
        "translation": "Одного часа достаточно.",
        "mistake": "A hour — неверно: звук h не произносится.",
        "quiz": {
          "question": "Выберите артикль: ___ apple.",
          "options": [
            "a",
            "the",
            "an"
          ],
          "answer": 2
        }
      },
      {
        "id": "articles-the",
        "level": "A1",
        "title": "The",
        "rule": "Определённый артикль нужен, когда собеседники понимают, о каком предмете речь, либо объект уникален в данном контексте.",
        "formula": "the + specific noun",
        "example": "Close the door, please.",
        "translation": "Закрой дверь, пожалуйста.",
        "mistake": "I saw the dog впервые — часто нужен a dog.",
        "quiz": {
          "question": "«Солнце» в обычном контексте:",
          "options": [
            "a sun",
            "the sun",
            "an sun"
          ],
          "answer": 1
        }
      },
      {
        "id": "zeroarticle",
        "level": "A2",
        "title": "Нулевой артикль",
        "rule": "Для общих высказываний о неисчисляемых существительных или множественном числе часто артикль не нужен.",
        "formula": "Ø + plural / uncountable",
        "example": "Music helps me relax.",
        "translation": "Музыка помогает мне расслабиться.",
        "mistake": "The music is beautiful — верно, если речь о конкретной музыке.",
        "quiz": {
          "question": "Как сказать «Я люблю кошек» в целом?",
          "options": [
            "I like cats.",
            "I like the cats.",
            "I like a cats."
          ],
          "answer": 0
        }
      },
      {
        "id": "plural",
        "level": "A1",
        "title": "Множественное число",
        "rule": "Обычно прибавляйте -s/-es, но некоторые формы неправильные: child–children, man–men, mouse–mice.",
        "formula": "one child → two children",
        "example": "Two children are playing.",
        "translation": "Двое детей играют.",
        "mistake": "Two childs — неправильная форма.",
        "quiz": {
          "question": "Множественное число child:",
          "options": [
            "childs",
            "children",
            "childes"
          ],
          "answer": 1
        }
      },
      {
        "id": "countability",
        "level": "A2",
        "title": "Исчисляемые и неисчисляемые",
        "rule": "Countable можно посчитать; uncountable обычно не имеет формы множественного числа. Advice, information, furniture — неисчисляемые.",
        "formula": "a piece of advice",
        "example": "I need some information.",
        "translation": "Мне нужна информация.",
        "mistake": "An information — обычно неверно.",
        "quiz": {
          "question": "Правильный вариант:",
          "options": [
            "an advice",
            "two informations",
            "some advice"
          ],
          "answer": 2
        }
      },
      {
        "id": "someany",
        "level": "A1",
        "title": "Some / any",
        "rule": "Some обычно в утверждениях, any в вопросах и отрицаниях. Some также встречается в предложениях и просьбах.",
        "formula": "some in statements; any in negatives",
        "example": "Do you have any milk?",
        "translation": "У тебя есть молоко?",
        "mistake": "I don't have some money — нейтрально обычно any.",
        "quiz": {
          "question": "Выберите: I don't have ___ time.",
          "options": [
            "some",
            "any",
            "a"
          ],
          "answer": 1
        }
      },
      {
        "id": "muchmany",
        "level": "A2",
        "title": "Much / many / a lot of",
        "rule": "Many — с исчисляемым множественным; much — с неисчисляемыми; a lot of — с обоими.",
        "formula": "many books; much water",
        "example": "How many books are there?",
        "translation": "Сколько там книг?",
        "mistake": "Much books — некорректно.",
        "quiz": {
          "question": "How ___ water do you need?",
          "options": [
            "many",
            "much",
            "few"
          ],
          "answer": 1
        }
      },
      {
        "id": "fewlittle",
        "level": "B1",
        "title": "Few / little / a few / a little",
        "rule": "Few и little подчёркивают нехватку; a few и a little — некоторое положительное количество. Few — исчисляемые, little — неисчисляемые.",
        "formula": "a few friends; a little water",
        "example": "I have a few minutes.",
        "translation": "У меня есть несколько минут.",
        "mistake": "A little friends — неверная сочетаемость.",
        "quiz": {
          "question": "Несколько яблок:",
          "options": [
            "a little apples",
            "much apples",
            "a few apples"
          ],
          "answer": 2
        }
      },
      {
        "id": "possessive",
        "level": "A1",
        "title": "Притяжательный падеж 's",
        "rule": "Чтобы обозначить принадлежность, чаще добавляйте 's к одушевлённому владельцу; у множественного на -s — только апостроф.",
        "formula": "Tom's book; the teachers' room",
        "example": "This is Anna's bag.",
        "translation": "Это сумка Анны.",
        "mistake": "Anna bag — без нужного показателя принадлежности.",
        "quiz": {
          "question": "Чья это книга? Книга Джона.",
          "options": [
            "John's book",
            "John book",
            "Johns book"
          ],
          "answer": 0
        }
      }
    ]
  },
  {
    "id": "pronouns",
    "title": "Местоимения и указатели",
    "lessons": [
      {
        "id": "subjectpron",
        "level": "A1",
        "title": "Личные местоимения",
        "rule": "Подлежащие: I, you, he, she, it, we, they. Для объекта используйте me, you, him, her, it, us, them.",
        "formula": "I see her; she sees me",
        "example": "They know him.",
        "translation": "Они знают его.",
        "mistake": "Me like it — местоимение в роли подлежащего должно быть I.",
        "quiz": {
          "question": "___ am tired.",
          "options": [
            "Me",
            "I",
            "Mine"
          ],
          "answer": 1
        }
      },
      {
        "id": "possessivepron",
        "level": "A1",
        "title": "My / mine",
        "rule": "My, your, his, her, our, their употребляются перед существительным; mine, yours, his, hers, ours, theirs — самостоятельно.",
        "formula": "my book; the book is mine",
        "example": "This phone is mine.",
        "translation": "Этот телефон мой.",
        "mistake": "This is mine phone — неверно.",
        "quiz": {
          "question": "This is ___ bag.",
          "options": [
            "mine",
            "my",
            "me"
          ],
          "answer": 1
        }
      },
      {
        "id": "reflexive",
        "level": "A2",
        "title": "Возвратные местоимения",
        "rule": "Myself, yourself, himself, herself, itself, ourselves, yourselves, themselves употребляются, когда действие возвращается к субъекту.",
        "formula": "She hurt herself",
        "example": "He made it himself.",
        "translation": "Он сделал это сам.",
        "mistake": "He made it hisself — нет такой стандартной формы.",
        "quiz": {
          "question": "She taught ___ English.",
          "options": [
            "her",
            "herself",
            "hers"
          ],
          "answer": 1
        }
      },
      {
        "id": "demonstrative",
        "level": "A1",
        "title": "This / that / these / those",
        "rule": "This/these — ближе; that/those — дальше. This/that с единственным, these/those с множественным.",
        "formula": "this book; those books",
        "example": "These shoes are new.",
        "translation": "Эти туфли новые.",
        "mistake": "This shoes — ошибка числа.",
        "quiz": {
          "question": "___ are my keys.",
          "options": [
            "This",
            "That",
            "These"
          ],
          "answer": 2
        }
      },
      {
        "id": "oneones",
        "level": "A2",
        "title": "One / ones",
        "rule": "Чтобы не повторять исчисляемое существительное, заменяйте его one в единственном и ones во множественном.",
        "formula": "the red one; the blue ones",
        "example": "I prefer the blue one.",
        "translation": "Я предпочитаю синюю вещь.",
        "mistake": "The blue it — некорректная замена при выборе.",
        "quiz": {
          "question": "Which shirt? The red ___.",
          "options": [
            "one",
            "ones",
            "it"
          ],
          "answer": 0
        }
      },
      {
        "id": "eachboth",
        "level": "B1",
        "title": "Each / every / both",
        "rule": "Each подчёркивает каждого по отдельности; every — всю группу; both — оба. После each/every обычно единственное число.",
        "formula": "every student is; both students are",
        "example": "Both answers are correct.",
        "translation": "Оба ответа верны.",
        "mistake": "Every students are — неверное согласование.",
        "quiz": {
          "question": "___ student needs a pen.",
          "options": [
            "Every",
            "Both",
            "Many"
          ],
          "answer": 0
        }
      },
      {
        "id": "otheranother",
        "level": "B1",
        "title": "Other / another / the other",
        "rule": "Another — ещё один или другой (единственное); other — другие; the other — оставшийся из известной группы.",
        "formula": "another cup; other people",
        "example": "Can I have another cup?",
        "translation": "Можно ещё чашку?",
        "mistake": "Another people — неверно.",
        "quiz": {
          "question": "I need ___ minute.",
          "options": [
            "other",
            "another",
            "others"
          ],
          "answer": 1
        }
      },
      {
        "id": "relativepron",
        "level": "B1",
        "title": "Who / which / that",
        "rule": "Who — о людях, which — о предметах/животных, that часто возможно в ограничительных придаточных. Уточнение следует сразу после определяемого слова.",
        "formula": "a person who works here",
        "example": "The woman who called is my aunt.",
        "translation": "Позвонившая женщина — моя тётя.",
        "mistake": "A person which — обычно неверно.",
        "quiz": {
          "question": "The man ___ lives here is kind.",
          "options": [
            "which",
            "where",
            "who"
          ],
          "answer": 2
        }
      }
    ]
  },
  {
    "id": "adjectives",
    "title": "Прилагательные и наречия",
    "lessons": [
      {
        "id": "adjectives",
        "level": "A1",
        "title": "Позиция прилагательного",
        "rule": "Прилагательное обычно стоит перед существительным или после глаголов-связок be, seem, feel, look.",
        "formula": "a new car; the car is new",
        "example": "It's an interesting story.",
        "translation": "Это интересная история.",
        "mistake": "An interestingly story — здесь нужно прилагательное.",
        "quiz": {
          "question": "A ___ day (красивый).",
          "options": [
            "beautiful",
            "beautifully",
            "beauty"
          ],
          "answer": 0
        }
      },
      {
        "id": "comparative",
        "level": "A2",
        "title": "Сравнительная степень",
        "rule": "Краткие прилагательные получают -er; длинные — more. После сравнения обычно than.",
        "formula": "bigger than; more useful than",
        "example": "This book is cheaper than that one.",
        "translation": "Эта книга дешевле той.",
        "mistake": "More cheaper — двойное сравнение.",
        "quiz": {
          "question": "This route is ___ than that one.",
          "options": [
            "more short",
            "shorter",
            "shortest"
          ],
          "answer": 1
        }
      },
      {
        "id": "superlative",
        "level": "A2",
        "title": "Превосходная степень",
        "rule": "Для самого высокого качества: the + -est или the most + прилагательное. Неправильные: good–better–best.",
        "formula": "the tallest; the most important",
        "example": "It's the best day.",
        "translation": "Это лучший день.",
        "mistake": "The most best — двойная форма.",
        "quiz": {
          "question": "He is the ___ student.",
          "options": [
            "better",
            "more good",
            "best"
          ],
          "answer": 2
        }
      },
      {
        "id": "as-as",
        "level": "B1",
        "title": "As ... as",
        "rule": "Для равного качества используйте as + прилагательное/наречие + as; отрицание not as ... as.",
        "formula": "as fast as",
        "example": "She is as tall as her sister.",
        "translation": "Она такая же высокая, как сестра.",
        "mistake": "As taller as — между as нужна базовая степень.",
        "quiz": {
          "question": "This is ___ easy ___ that.",
          "options": [
            "as ... as",
            "more ... than",
            "so ... than"
          ],
          "answer": 0
        }
      },
      {
        "id": "adverbs",
        "level": "A2",
        "title": "Наречия образа действия",
        "rule": "Наречие описывает действие: часто образуется добавлением -ly к прилагательному. Есть исключения fast, hard, well.",
        "formula": "careful → carefully",
        "example": "He drives carefully.",
        "translation": "Он водит осторожно.",
        "mistake": "He drives careful — обычно нужно carefully.",
        "quiz": {
          "question": "She sings ___.",
          "options": [
            "beautiful",
            "beauty",
            "beautifully"
          ],
          "answer": 2
        }
      },
      {
        "id": "adverbplace",
        "level": "B1",
        "title": "Место наречий частоты",
        "rule": "Always, usually, often, sometimes, never обычно стоят перед смысловым глаголом, но после be.",
        "formula": "She often goes; she is often late",
        "example": "I usually walk home.",
        "translation": "Я обычно иду домой пешком.",
        "mistake": "Usually she is late — возможно с выделением, но базовый порядок she is usually late.",
        "quiz": {
          "question": "She ___ late.",
          "options": [
            "is never",
            "never is",
            "never be"
          ],
          "answer": 0
        }
      },
      {
        "id": "toooenough",
        "level": "B1",
        "title": "Too / enough",
        "rule": "Too + прилагательное показывает избыток, adjective + enough — достаточность; enough + существительное.",
        "formula": "too expensive; old enough",
        "example": "This box is too heavy.",
        "translation": "Эта коробка слишком тяжёлая.",
        "mistake": "Enough old — неверный порядок.",
        "quiz": {
          "question": "He isn't tall ___.",
          "options": [
            "too",
            "enough",
            "much"
          ],
          "answer": 1
        }
      },
      {
        "id": "sosuch",
        "level": "B1",
        "title": "So / such",
        "rule": "So + прилагательное/наречие, such + (a/an) + прилагательное + существительное.",
        "formula": "so good; such a good idea",
        "example": "It was such a nice day.",
        "translation": "Это был такой приятный день.",
        "mistake": "So a good day — неверно.",
        "quiz": {
          "question": "It is ___ cold today.",
          "options": [
            "such",
            "so",
            "such a"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "present",
    "title": "Настоящие времена",
    "lessons": [
      {
        "id": "present-simple",
        "level": "A1",
        "title": "Present Simple",
        "rule": "Для привычек, фактов и расписаний: V1, с he/she/it прибавляем -s/-es. Вопросы — do/does.",
        "formula": "I work; she works",
        "example": "She works every day.",
        "translation": "Она работает каждый день.",
        "mistake": "She work every day — отсутствует -s.",
        "quiz": {
          "question": "He ___ in a bank.",
          "options": [
            "work",
            "works",
            "working"
          ],
          "answer": 1
        }
      },
      {
        "id": "present-cont",
        "level": "A1",
        "title": "Present Continuous",
        "rule": "Для действия сейчас и временной ситуации: am/is/are + V-ing; также для договорённостей о будущем.",
        "formula": "am/is/are + V-ing",
        "example": "I am studying now.",
        "translation": "Я сейчас занимаюсь.",
        "mistake": "I studying now — нужен am.",
        "quiz": {
          "question": "Look! It ___ raining.",
          "options": [
            "is",
            "does",
            "has"
          ],
          "answer": 0
        }
      },
      {
        "id": "present-contrast",
        "level": "A2",
        "title": "Simple vs Continuous",
        "rule": "Present Simple говорит о регулярном, Present Continuous — о текущем или временном. Глаголы состояния часто не употребляются в Continuous.",
        "formula": "I work / I am working",
        "example": "I usually drive, but today I'm walking.",
        "translation": "Обычно я еду на машине, но сегодня иду пешком.",
        "mistake": "I am knowing — обычно неверно.",
        "quiz": {
          "question": "Right now she ___ dinner.",
          "options": [
            "cooks every day",
            "is cooking",
            "cook"
          ],
          "answer": 1
        }
      },
      {
        "id": "stative",
        "level": "B1",
        "title": "Глаголы состояния",
        "rule": "Know, believe, own, want, understand чаще в Simple. Некоторые меняют смысл: I think / I'm thinking.",
        "formula": "I know; I am thinking",
        "example": "I know the answer.",
        "translation": "Я знаю ответ.",
        "mistake": "I'm knowing the answer — обычно не используется.",
        "quiz": {
          "question": "I ___ the answer.",
          "options": [
            "am knowing",
            "knowing",
            "know"
          ],
          "answer": 2
        }
      },
      {
        "id": "present-perfect",
        "level": "A2",
        "title": "Present Perfect",
        "rule": "Связывает прошлое с настоящим: have/has + V3. Для опыта, результата, уже/ещё; не сочетайте с конкретным завершённым моментом вроде yesterday.",
        "formula": "have/has + past participle",
        "example": "I've lost my keys.",
        "translation": "Я потерял ключи (их сейчас нет).",
        "mistake": "I have seen him yesterday — обычно Past Simple.",
        "quiz": {
          "question": "She has ___ her homework.",
          "options": [
            "finish",
            "finished",
            "finishing"
          ],
          "answer": 1
        }
      },
      {
        "id": "perfect-cont",
        "level": "B1",
        "title": "Present Perfect Continuous",
        "rule": "Действие началось раньше и длилось до сих пор или недавно закончилось с заметным эффектом: have/has been + V-ing.",
        "formula": "have/has been + V-ing",
        "example": "I've been waiting for an hour.",
        "translation": "Я жду уже час.",
        "mistake": "I've waiting — отсутствует been.",
        "quiz": {
          "question": "They have been ___ all morning.",
          "options": [
            "study",
            "studied",
            "studying"
          ],
          "answer": 2
        }
      },
      {
        "id": "sincefor",
        "level": "A2",
        "title": "Since / for",
        "rule": "Since указывает точку начала (since Monday), for — продолжительность (for two days).",
        "formula": "since 2020; for three years",
        "example": "I've lived here since 2020.",
        "translation": "Я живу здесь с 2020 года.",
        "mistake": "For 2020 — неверно для момента начала.",
        "quiz": {
          "question": "I've studied for ___ years.",
          "options": [
            "three",
            "Monday",
            "2019"
          ],
          "answer": 0
        }
      },
      {
        "id": "evernever",
        "level": "A2",
        "title": "Ever / never / already / yet",
        "rule": "Ever — когда-либо, never — никогда, already — уже, yet — ещё/уже в вопросах и отрицаниях.",
        "formula": "Have you ever...?; not yet",
        "example": "Have you ever been to London?",
        "translation": "Ты когда-нибудь был в Лондоне?",
        "mistake": "I haven't finished already — обычно yet.",
        "quiz": {
          "question": "Have you ___ tried sushi?",
          "options": [
            "yet",
            "ever",
            "already"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "past",
    "title": "Прошедшие времена",
    "lessons": [
      {
        "id": "past-simple",
        "level": "A1",
        "title": "Past Simple",
        "rule": "Завершённое событие в прошлом: V2 или -ed; вопрос/отрицание с did + V1. Часто yesterday, last year, ago.",
        "formula": "V2; did + V1",
        "example": "I visited her yesterday.",
        "translation": "Я навещал её вчера.",
        "mistake": "Did you went? — после did нужна V1.",
        "quiz": {
          "question": "Did you ___ it?",
          "options": [
            "saw",
            "see",
            "seen"
          ],
          "answer": 1
        }
      },
      {
        "id": "irregular",
        "level": "A2",
        "title": "Неправильные глаголы",
        "rule": "Некоторые глаголы имеют особые формы V2/V3, которые нужно учить: go–went–gone, see–saw–seen, write–wrote–written.",
        "formula": "go → went → gone",
        "example": "She went home early.",
        "translation": "Она рано ушла домой.",
        "mistake": "Goed — не существует в стандартном английском.",
        "quiz": {
          "question": "Past Simple от go:",
          "options": [
            "went",
            "gone",
            "goed"
          ],
          "answer": 0
        }
      },
      {
        "id": "past-cont",
        "level": "A2",
        "title": "Past Continuous",
        "rule": "Для процесса в определённый момент прошлого: was/were + V-ing. Часто фон для короткого события в Past Simple.",
        "formula": "was/were + V-ing",
        "example": "I was sleeping at 10 p.m.",
        "translation": "В 10 вечера я спал.",
        "mistake": "I were sleeping — с I используйте was.",
        "quiz": {
          "question": "We ___ watching a film.",
          "options": [
            "was",
            "were",
            "been"
          ],
          "answer": 1
        }
      },
      {
        "id": "past-contrast",
        "level": "B1",
        "title": "Past Simple vs Continuous",
        "rule": "Длительное действие (was doing) может прерываться коротким (did). While часто с процессом, when — с событием.",
        "formula": "was/were V-ing + when + V2",
        "example": "I was cooking when he called.",
        "translation": "Я готовил, когда он позвонил.",
        "mistake": "I cooked when he was calling — меняет смысл.",
        "quiz": {
          "question": "I ___ when the phone rang.",
          "options": [
            "was sleeping",
            "slept yesterday",
            "have slept"
          ],
          "answer": 0
        }
      },
      {
        "id": "past-perfect",
        "level": "B1",
        "title": "Past Perfect",
        "rule": "Для события, произошедшего раньше другого момента в прошлом: had + V3.",
        "formula": "had + V3",
        "example": "She had left before I arrived.",
        "translation": "Она ушла до моего прихода.",
        "mistake": "Had went — V3 от go — gone.",
        "quiz": {
          "question": "By 8, they had ___.",
          "options": [
            "leave",
            "left",
            "leaving"
          ],
          "answer": 1
        }
      },
      {
        "id": "past-perfect-cont",
        "level": "B2",
        "title": "Past Perfect Continuous",
        "rule": "Подчёркивает длительность действия до другого момента в прошлом: had been + V-ing.",
        "formula": "had been + V-ing",
        "example": "He had been working for hours before the break.",
        "translation": "До перерыва он работал уже несколько часов.",
        "mistake": "Had been work — нужна форма -ing.",
        "quiz": {
          "question": "She had been ___ for hours.",
          "options": [
            "read",
            "reads",
            "reading"
          ],
          "answer": 2
        }
      },
      {
        "id": "used-to",
        "level": "B1",
        "title": "Used to / would",
        "rule": "Used to + V1 для прошлых привычек и состояний, которых теперь нет. Would + V1 — повторявшиеся действия в прошлом, но не прошлые состояния.",
        "formula": "used to + V1",
        "example": "I used to live here.",
        "translation": "Раньше я здесь жил.",
        "mistake": "I use to lived — неверно.",
        "quiz": {
          "question": "I ___ play outside as a child.",
          "options": [
            "used to",
            "used for",
            "am used to"
          ],
          "answer": 0
        }
      },
      {
        "id": "past-habits",
        "level": "B1",
        "title": "Be used to / get used to",
        "rule": "Be used to + noun/V-ing означает «быть привычным», get used to — «привыкать». Не путайте с used to + V1.",
        "formula": "be used to + V-ing",
        "example": "I'm used to getting up early.",
        "translation": "Я привык рано вставать.",
        "mistake": "Used to get up и be used to getting up — разные конструкции.",
        "quiz": {
          "question": "I'm used to ___ early.",
          "options": [
            "wake",
            "waking up",
            "woke"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "future",
    "title": "Будущее время",
    "lessons": [
      {
        "id": "will",
        "level": "A1",
        "title": "Future Simple (will)",
        "rule": "Will + V1 для спонтанного решения, прогноза, обещания и предложения помощи. После will не добавляйте -s.",
        "formula": "will + V1",
        "example": "I'll call you tomorrow.",
        "translation": "Я позвоню тебе завтра.",
        "mistake": "She will calls — после will V1.",
        "quiz": {
          "question": "They will ___ soon.",
          "options": [
            "arrive",
            "arrives",
            "arrived"
          ],
          "answer": 0
        }
      },
      {
        "id": "goingto",
        "level": "A2",
        "title": "Be going to",
        "rule": "Для намерений и прогнозов по видимым признакам: am/is/are going to + V1.",
        "formula": "be going to + V1",
        "example": "It's going to rain.",
        "translation": "Сейчас пойдёт дождь.",
        "mistake": "I going to leave — пропущено am.",
        "quiz": {
          "question": "She is going to ___ a car.",
          "options": [
            "buys",
            "buy",
            "bought"
          ],
          "answer": 1
        }
      },
      {
        "id": "present-future",
        "level": "B1",
        "title": "Present Continuous для планов",
        "rule": "Настоящее длительное время может обозначать организованную договорённость на будущее с конкретным планом.",
        "formula": "am/is/are V-ing + future time",
        "example": "I'm meeting Anna tomorrow.",
        "translation": "Завтра я встречаюсь с Анной.",
        "mistake": "I meet Anna tomorrow — возможно расписание/привычка; не нейтральная договорённость.",
        "quiz": {
          "question": "We ___ flying on Friday.",
          "options": [
            "are",
            "have",
            "do"
          ],
          "answer": 0
        }
      },
      {
        "id": "timetable",
        "level": "B1",
        "title": "Present Simple в расписаниях",
        "rule": "Расписания транспорта, уроков, мероприятий часто описываются Present Simple, даже если событие в будущем.",
        "formula": "train leaves at six",
        "example": "The train leaves at 6.",
        "translation": "Поезд отходит в шесть.",
        "mistake": "Train will leaves — после will V1.",
        "quiz": {
          "question": "The flight ___ at noon.",
          "options": [
            "leave",
            "leaves",
            "is leave"
          ],
          "answer": 1
        }
      },
      {
        "id": "future-cont",
        "level": "B2",
        "title": "Future Continuous",
        "rule": "Для действия в процессе в определённое время в будущем: will be + V-ing.",
        "formula": "will be + V-ing",
        "example": "I'll be working at five.",
        "translation": "В пять я буду работать.",
        "mistake": "Will be work — нужна -ing.",
        "quiz": {
          "question": "At 9, I will be ___.",
          "options": [
            "study",
            "studied",
            "studying"
          ],
          "answer": 2
        }
      },
      {
        "id": "future-perfect",
        "level": "B2",
        "title": "Future Perfect",
        "rule": "Для завершения к определённому сроку в будущем: will have + V3; Future Perfect Continuous — для длительности до срока.",
        "formula": "will have + V3",
        "example": "I'll have finished by Friday.",
        "translation": "К пятнице я закончу.",
        "mistake": "Will have finish — нужна V3.",
        "quiz": {
          "question": "By Monday, he will have ___.",
          "options": [
            "returned",
            "return",
            "returning"
          ],
          "answer": 0
        }
      },
      {
        "id": "future-time",
        "level": "B1",
        "title": "Придаточные времени о будущем",
        "rule": "После when, as soon as, before, after, until при значении будущего обычно Present Simple, а не will.",
        "formula": "I'll call when I arrive",
        "example": "I'll text you when I get home.",
        "translation": "Я напишу, когда приду домой.",
        "mistake": "When I will arrive — обычно неверно.",
        "quiz": {
          "question": "I'll call you when she ___.",
          "options": [
            "will arrive",
            "arrives",
            "arriving"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "modals",
    "title": "Модальные глаголы",
    "lessons": [
      {
        "id": "can",
        "level": "A1",
        "title": "Can / could",
        "rule": "Can + V1 выражает способность, возможность, разрешение. Could — прошлую способность или вежливую просьбу.",
        "formula": "can/could + V1",
        "example": "Can you help me?",
        "translation": "Можешь мне помочь?",
        "mistake": "Can to swim — после can нет to.",
        "quiz": {
          "question": "She can ___ well.",
          "options": [
            "swims",
            "swim",
            "swimming"
          ],
          "answer": 1
        }
      },
      {
        "id": "musthave",
        "level": "A2",
        "title": "Must / have to",
        "rule": "Must — внутренняя необходимость или строгое требование; have to — внешняя обязанность. Mustn't = запрещено, don't have to = необязательно.",
        "formula": "must V1; have to V1",
        "example": "You must wear a helmet.",
        "translation": "Надень шлем обязательно.",
        "mistake": "Don't have to ≠ mustn't.",
        "quiz": {
          "question": "«Здесь нельзя курить»:",
          "options": [
            "You don't have to smoke.",
            "You mustn't smoke.",
            "You must smoke."
          ],
          "answer": 1
        }
      },
      {
        "id": "should",
        "level": "A2",
        "title": "Should / ought to",
        "rule": "Для совета и рекомендации: should + V1, ought to + V1. Отрицание shouldn't.",
        "formula": "should + V1",
        "example": "You should rest.",
        "translation": "Тебе стоит отдохнуть.",
        "mistake": "Should to go — после should нет to.",
        "quiz": {
          "question": "You ___ see a doctor.",
          "options": [
            "should",
            "should to",
            "must to"
          ],
          "answer": 0
        }
      },
      {
        "id": "maymight",
        "level": "B1",
        "title": "May / might",
        "rule": "Вероятность или разрешение: may/might + V1. Might часто звучит менее уверенно; разница зависит от контекста.",
        "formula": "may/might + V1",
        "example": "It might snow tonight.",
        "translation": "Сегодня ночью, возможно, будет снег.",
        "mistake": "Might to rain — неверно.",
        "quiz": {
          "question": "She ___ be late.",
          "options": [
            "mights",
            "might",
            "might to"
          ],
          "answer": 1
        }
      },
      {
        "id": "modalperfect",
        "level": "B2",
        "title": "Модальные + have + V3",
        "rule": "Must have + V3 — уверенный вывод о прошлом; might have — возможность; should have — сожаление/критика.",
        "formula": "modal + have + V3",
        "example": "You should have called.",
        "translation": "Тебе следовало позвонить.",
        "mistake": "Should have call — нужна V3.",
        "quiz": {
          "question": "He must have ___ it.",
          "options": [
            "forget",
            "forgotten",
            "forgetting"
          ],
          "answer": 1
        }
      },
      {
        "id": "hadbetter",
        "level": "B1",
        "title": "Had better",
        "rule": "Had better + V1 — настойчивый совет с намёком на последствия. Отрицание had better not.",
        "formula": "had better + V1",
        "example": "You'd better leave now.",
        "translation": "Лучше уйди сейчас.",
        "mistake": "Had better to leave — неверно.",
        "quiz": {
          "question": "You'd better ___ late.",
          "options": [
            "not be",
            "don't be",
            "not to be"
          ],
          "answer": 0
        }
      },
      {
        "id": "wouldrather",
        "level": "B2",
        "title": "Would rather",
        "rule": "Would rather + V1 для предпочтения. С другим субъектом: would rather + subject + Past Simple для нынешнего/будущего предпочтения.",
        "formula": "would rather + V1",
        "example": "I'd rather stay home.",
        "translation": "Я бы предпочёл остаться дома.",
        "mistake": "Would rather to stay — неверно.",
        "quiz": {
          "question": "I'd rather ___ now.",
          "options": [
            "leaving",
            "leave",
            "to leave"
          ],
          "answer": 1
        }
      },
      {
        "id": "neednt",
        "level": "B2",
        "title": "Needn't / don't need to",
        "rule": "Отсутствие необходимости: needn't + V1 или don't need to + V1. Needn't have + V3 — действие уже сделали зря.",
        "formula": "needn't + V1",
        "example": "You needn't wait.",
        "translation": "Тебе не нужно ждать.",
        "mistake": "Needn't to wait — неверно.",
        "quiz": {
          "question": "You ___ pay today.",
          "options": [
            "needn't",
            "mustn't to",
            "needn't to"
          ],
          "answer": 0
        }
      },
      {
        "id": "deduction",
        "level": "B2",
        "title": "Must / can't / may для догадок",
        "rule": "Must — почти уверенный положительный вывод, can't — почти уверенный отрицательный, may/might/could — вероятность.",
        "formula": "must be; can't be; might be",
        "example": "He can't be at home; he's abroad.",
        "translation": "Его не может быть дома, он за границей.",
        "mistake": "Mustn't be как логический вывод — обычно заменяют can't be.",
        "quiz": {
          "question": "He ___ be tired; he ran a marathon.",
          "options": [
            "can't",
            "must",
            "mustn't"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "nonfinite",
    "title": "Инфинитив, герундий, причастия",
    "lessons": [
      {
        "id": "infinitive",
        "level": "A2",
        "title": "Инфинитив с to",
        "rule": "To + V1 часто после want, decide, hope, plan и для цели. После модальных глаголов обычно bare infinitive без to.",
        "formula": "want to go; can go",
        "example": "I want to learn English.",
        "translation": "Я хочу выучить английский.",
        "mistake": "I want learn — после want обычно to.",
        "quiz": {
          "question": "I decided ___ early.",
          "options": [
            "leave",
            "to leave",
            "leaving"
          ],
          "answer": 1
        }
      },
      {
        "id": "gerund",
        "level": "B1",
        "title": "Герундий (V-ing)",
        "rule": "После enjoy, avoid, finish, mind, suggest обычно V-ing; после предлогов — тоже V-ing.",
        "formula": "enjoy + V-ing",
        "example": "She enjoys reading.",
        "translation": "Ей нравится читать.",
        "mistake": "Enjoy to read — обычно неверно.",
        "quiz": {
          "question": "I enjoy ___ books.",
          "options": [
            "to read",
            "read",
            "reading"
          ],
          "answer": 2
        }
      },
      {
        "id": "verbpatterns",
        "level": "B1",
        "title": "Stop / remember / try",
        "rule": "Stop doing — прекратить действие; stop to do — остановиться ради другого. Remember doing — помнить прошлое, remember to do — не забыть сделать.",
        "formula": "stop doing vs stop to do",
        "example": "He stopped smoking.",
        "translation": "Он бросил курить.",
        "mistake": "He stopped to smoke — остановился, чтобы покурить.",
        "quiz": {
          "question": "«Он бросил курить»:",
          "options": [
            "He stopped smoking.",
            "He stopped to smoke.",
            "He stopped smoke."
          ],
          "answer": 0
        }
      },
      {
        "id": "participle",
        "level": "B2",
        "title": "Причастия -ing / -ed",
        "rule": "Формы на -ing описывают вызывающее чувство, а -ed — испытывающее чувство; также употребляются в сокращённых придаточных.",
        "formula": "boring film; bored person",
        "example": "I'm interested in history.",
        "translation": "Меня интересует история.",
        "mistake": "I'm interesting — означает «я интересный».",
        "quiz": {
          "question": "I am ___ by the story.",
          "options": [
            "interesting",
            "interested",
            "interest"
          ],
          "answer": 1
        }
      },
      {
        "id": "infpurpose",
        "level": "B1",
        "title": "Инфинитив цели",
        "rule": "Для обозначения цели: to + V1, in order to, so as to; отрицательная цель — in order not to.",
        "formula": "to + V1",
        "example": "I went out to buy bread.",
        "translation": "Я вышел купить хлеб.",
        "mistake": "For buy bread — неверно.",
        "quiz": {
          "question": "She studies ___ pass the exam.",
          "options": [
            "for",
            "to",
            "so"
          ],
          "answer": 1
        }
      },
      {
        "id": "letmake",
        "level": "B1",
        "title": "Let / make / help",
        "rule": "После let и make в активном залоге используется V1 без to; после help часто допустимы обе формы.",
        "formula": "let/make + object + V1",
        "example": "They made me wait.",
        "translation": "Они заставили меня ждать.",
        "mistake": "Made me to wait — в активном залоге неверно.",
        "quiz": {
          "question": "Let me ___ you.",
          "options": [
            "help",
            "to helping",
            "helps"
          ],
          "answer": 0
        }
      },
      {
        "id": "perception",
        "level": "B2",
        "title": "See / hear / watch + object",
        "rule": "После глаголов восприятия bare infinitive обозначает событие целиком; V-ing подчёркивает процесс.",
        "formula": "saw him cross / crossing",
        "example": "I saw her crossing the road.",
        "translation": "Я видел, как она переходила дорогу.",
        "mistake": "Saw her to cross — в активном залоге неверно.",
        "quiz": {
          "question": "I heard him ___ the song (целиком).",
          "options": [
            "to sing",
            "sing",
            "sang"
          ],
          "answer": 1
        }
      }
    ]
  },
  {
    "id": "clauses",
    "title": "Условные и сложные предложения",
    "lessons": [
      {
        "id": "zero-cond",
        "level": "A2",
        "title": "Zero Conditional",
        "rule": "Закономерность: if + Present Simple, Present Simple. Обе части описывают общий факт.",
        "formula": "If + Present, Present",
        "example": "If water freezes, it expands.",
        "translation": "Если вода замерзает, она расширяется.",
        "mistake": "If water will freeze — не для обычного Zero Conditional.",
        "quiz": {
          "question": "If you heat ice, it ___.",
          "options": [
            "melts",
            "will melted",
            "melted"
          ],
          "answer": 0
        }
      },
      {
        "id": "first-cond",
        "level": "B1",
        "title": "First Conditional",
        "rule": "Реальное условие в будущем: if + Present Simple, will + V1 в главной части.",
        "formula": "If + Present, will + V1",
        "example": "If it rains, I'll stay home.",
        "translation": "Если пойдёт дождь, останусь дома.",
        "mistake": "If it will rain — обычно неверно.",
        "quiz": {
          "question": "If she calls, I ___ answer.",
          "options": [
            "would",
            "will",
            "had"
          ],
          "answer": 1
        }
      },
      {
        "id": "second-cond",
        "level": "B1",
        "title": "Second Conditional",
        "rule": "Маловероятная/гипотетическая ситуация сейчас или в будущем: if + Past Simple, would + V1. Were возможно со всеми лицами в формальном стиле.",
        "formula": "If + Past, would + V1",
        "example": "If I had time, I'd travel.",
        "translation": "Если бы у меня было время, я бы путешествовал.",
        "mistake": "If I would have time — в условной части обычно без would.",
        "quiz": {
          "question": "If I were rich, I ___ travel.",
          "options": [
            "will",
            "had",
            "would"
          ],
          "answer": 2
        }
      },
      {
        "id": "third-cond",
        "level": "B2",
        "title": "Third Conditional",
        "rule": "Невозможное уже условие в прошлом: if + had + V3, would have + V3.",
        "formula": "If + had V3, would have V3",
        "example": "If I'd known, I'd have helped.",
        "translation": "Если бы я знал, помог бы.",
        "mistake": "If I would have known — обычно ошибка.",
        "quiz": {
          "question": "If I had left earlier, I ___ arrived on time.",
          "options": [
            "would have",
            "will have",
            "would"
          ],
          "answer": 0
        }
      },
      {
        "id": "mixed-cond",
        "level": "C1",
        "title": "Mixed Conditionals",
        "rule": "Можно связывать прошлую причину с нынешним следствием: if + had V3, would + V1 сейчас; или настоящее условие с прошлым результатом.",
        "formula": "If + had V3, would + V1",
        "example": "If I'd slept, I wouldn't be tired now.",
        "translation": "Если бы я поспал, сейчас не устал бы.",
        "mistake": "Автоматически подставлять would have в обе части нельзя.",
        "quiz": {
          "question": "If I had studied, I ___ a doctor now.",
          "options": [
            "will be",
            "would be",
            "would have been yesterday"
          ],
          "answer": 1
        }
      },
      {
        "id": "unless",
        "level": "B1",
        "title": "Unless / provided / as long as",
        "rule": "Unless = if not; provided (that), as long as = при условии что. После них для будущего обычно настоящее время.",
        "formula": "Unless + Present, will + V1",
        "example": "Unless you hurry, you'll miss it.",
        "translation": "Если не поспешишь, опоздаешь.",
        "mistake": "Unless you won't hurry — двойное отрицание не нужно.",
        "quiz": {
          "question": "Unless it ___, we'll go.",
          "options": [
            "rains",
            "will rain",
            "rained"
          ],
          "answer": 0
        }
      },
      {
        "id": "relative",
        "level": "B1",
        "title": "Определительные придаточные",
        "rule": "Ограничительные придаточные выделяют нужный объект и обычно без запятых. Неограничительные добавляют справку и выделяются запятыми.",
        "formula": "the man who lives here",
        "example": "The girl who lives next door is kind.",
        "translation": "Девушка по соседству добрая.",
        "mistake": "The girl, who lives next door — меняет структуру при дополнительных сведениях.",
        "quiz": {
          "question": "The book ___ I bought is new.",
          "options": [
            "where",
            "that",
            "who"
          ],
          "answer": 1
        }
      },
      {
        "id": "relativeomit",
        "level": "B2",
        "title": "Опущение who / that / which",
        "rule": "В определительных придаточных относительное местоимение часто можно опустить, если оно дополнение, но нельзя, если подлежащее.",
        "formula": "the book (that) I read",
        "example": "The film I saw was great.",
        "translation": "Фильм, который я видел, был отличным.",
        "mistake": "The man lives here is kind — who как подлежащее нельзя опустить.",
        "quiz": {
          "question": "The man ___ called me is here.",
          "options": [
            "who",
            "what",
            "where"
          ],
          "answer": 0
        }
      },
      {
        "id": "conjunctions",
        "level": "B1",
        "title": "Although / despite / however",
        "rule": "Although + предложение; despite/in spite of + существительное или V-ing; however соединяет мысли с пунктуацией.",
        "formula": "although + clause; despite + noun",
        "example": "Although it rained, we went out.",
        "translation": "Хотя шёл дождь, мы вышли.",
        "mistake": "Despite it rained — неверно.",
        "quiz": {
          "question": "___ the rain, we played.",
          "options": [
            "Although",
            "Despite",
            "However"
          ],
          "answer": 1
        }
      },
      {
        "id": "purposeclauses",
        "level": "B2",
        "title": "So that / in order that",
        "rule": "So that + предложение с can/could/will/would для цели. Не путать с so + adjective + that для результата.",
        "formula": "so that + subject + can/could",
        "example": "She whispered so that nobody could hear.",
        "translation": "Она шептала, чтобы никто не услышал.",
        "mistake": "So that nobody hearing — неполная структура.",
        "quiz": {
          "question": "He spoke slowly so that we ___ understand.",
          "options": [
            "could",
            "to",
            "for"
          ],
          "answer": 0
        }
      }
    ]
  },
  {
    "id": "voice",
    "title": "Залог, речь и вопросы",
    "lessons": [
      {
        "id": "passive-present",
        "level": "B1",
        "title": "Пассивный залог",
        "rule": "Подлежащее получает действие: be в нужном времени + V3. Исполнитель с by при необходимости.",
        "formula": "is/are + V3",
        "example": "English is spoken here.",
        "translation": "Здесь говорят по-английски.",
        "mistake": "Is speak — нужна третья форма.",
        "quiz": {
          "question": "The room is ___ every day.",
          "options": [
            "clean",
            "cleaned",
            "cleaning"
          ],
          "answer": 1
        }
      },
      {
        "id": "passive-past",
        "level": "B1",
        "title": "Passive в прошедшем",
        "rule": "Past Simple Passive: was/were + V3; Present Perfect Passive: have/has been + V3.",
        "formula": "was/were + V3",
        "example": "The bridge was built in 1990.",
        "translation": "Мост построили в 1990 году.",
        "mistake": "Was build — нужна V3.",
        "quiz": {
          "question": "The letters were ___.",
          "options": [
            "send",
            "sending",
            "sent"
          ],
          "answer": 2
        }
      },
      {
        "id": "passive-modal",
        "level": "B2",
        "title": "Пассив с модальными",
        "rule": "Модальные формы: modal + be + V3; в прошлом — modal + have been + V3.",
        "formula": "must be + V3",
        "example": "The form must be signed.",
        "translation": "Форму нужно подписать.",
        "mistake": "Must signed — пропущено be.",
        "quiz": {
          "question": "It should be ___.",
          "options": [
            "checked",
            "check",
            "checking"
          ],
          "answer": 0
        }
      },
      {
        "id": "questions-tags",
        "level": "B1",
        "title": "Разделительные вопросы",
        "rule": "Tag question повторяет вспомогательный глагол, обычно противоположной полярности; подлежащее заменяется местоимением.",
        "formula": "She is here, isn't she?",
        "example": "You're ready, aren't you?",
        "translation": "Ты готов, правда?",
        "mistake": "You are ready, don't you — неверный вспомогательный.",
        "quiz": {
          "question": "He works here, ___?",
          "options": [
            "isn't he",
            "doesn't he",
            "didn't he"
          ],
          "answer": 1
        }
      },
      {
        "id": "indirectquestions",
        "level": "B1",
        "title": "Косвенные вопросы",
        "rule": "После Could you tell me / Do you know порядок слов обычно как в утверждении. Do/does/did внутри косвенного вопроса не нужны.",
        "formula": "Do you know where he lives?",
        "example": "Do you know where she works?",
        "translation": "Ты знаешь, где она работает?",
        "mistake": "Do you know where does she work — неверно.",
        "quiz": {
          "question": "Could you tell me where he ___?",
          "options": [
            "live",
            "does live",
            "lives"
          ],
          "answer": 2
        }
      },
      {
        "id": "reported-statements",
        "level": "B1",
        "title": "Косвенная речь",
        "rule": "После глагола сообщения в прошлом время часто сдвигается назад: am/is → was, will → would, can → could; при постоянной истине сдвиг необязателен.",
        "formula": "said (that) + backshift",
        "example": "He said he was tired.",
        "translation": "Он сказал, что устал.",
        "mistake": "He said me — обычно told me или said to me.",
        "quiz": {
          "question": "She said she ___ busy.",
          "options": [
            "was",
            "is always",
            "be"
          ],
          "answer": 0
        }
      },
      {
        "id": "reported-questions",
        "level": "B2",
        "title": "Косвенная речь: вопросы",
        "rule": "В пересказе вопроса используйте порядок утверждения: asked where I lived; для yes/no — if/whether.",
        "formula": "asked if/whether + statement order",
        "example": "She asked if I was ready.",
        "translation": "Она спросила, готов ли я.",
        "mistake": "She asked was I ready — неверный порядок.",
        "quiz": {
          "question": "He asked where I ___.",
          "options": [
            "do live",
            "lived",
            "did live"
          ],
          "answer": 1
        }
      },
      {
        "id": "causative",
        "level": "B2",
        "title": "Have / get something done",
        "rule": "Когда действие выполняет другой за вас: have/get + object + V3. Отличается от have someone do something.",
        "formula": "have + object + V3",
        "example": "I had my hair cut.",
        "translation": "Мне подстригли волосы.",
        "mistake": "I had my hair cutted — неверная форма.",
        "quiz": {
          "question": "She had her car ___.",
          "options": [
            "repair",
            "repairing",
            "repaired"
          ],
          "answer": 2
        }
      },
      {
        "id": "questions-subject",
        "level": "B2",
        "title": "Вопрос к подлежащему",
        "rule": "Когда who или what — подлежащее, в Present/Past Simple обычно не ставят do/does/did: Who called?",
        "formula": "Who + verb?",
        "example": "Who lives here?",
        "translation": "Кто здесь живёт?",
        "mistake": "Who does live here — возможно только для эмфазы.",
        "quiz": {
          "question": "Who ___ the window?",
          "options": [
            "broke",
            "did break",
            "was break"
          ],
          "answer": 0
        }
      },
      {
        "id": "emphasis-do",
        "level": "B2",
        "title": "Do / does / did для усиления",
        "rule": "В утверждениях do/does/did перед V1 может усиливать смысл или исправлять отрицание.",
        "formula": "I do agree; she did call",
        "example": "I do understand.",
        "translation": "Я действительно понимаю.",
        "mistake": "I do understands — после do V1.",
        "quiz": {
          "question": "She ___ like it, believe me.",
          "options": [
            "does",
            "is",
            "has"
          ],
          "answer": 0
        }
      }
    ]
  },
  {
    "id": "advanced",
    "title": "Продвинутая грамматика",
    "lessons": [
      {
        "id": "subjunctive",
        "level": "C1",
        "title": "Subjunctive после suggest",
        "rule": "В формальном английском после suggest/insist/essential that возможна базовая форма глагола для всех лиц.",
        "formula": "suggest that he go",
        "example": "They insisted that she be present.",
        "translation": "Они настаивали, чтобы она присутствовала.",
        "mistake": "They insisted that she is present — другая конструкция.",
        "quiz": {
          "question": "They suggested that he ___ early.",
          "options": [
            "leaves",
            "leave",
            "left"
          ],
          "answer": 1
        }
      },
      {
        "id": "wish",
        "level": "B2",
        "title": "Wish / if only",
        "rule": "Wish + Past Simple для сожаления о настоящем; wish + Past Perfect — о прошлом; wish + would — желаемая перемена поведения.",
        "formula": "wish + Past / had V3",
        "example": "I wish I knew.",
        "translation": "Жаль, что я не знаю.",
        "mistake": "I wish I know — в ирреальном значении обычно прошедшая форма.",
        "quiz": {
          "question": "I wish I ___ more time.",
          "options": [
            "have",
            "will have",
            "had"
          ],
          "answer": 2
        }
      },
      {
        "id": "inversion",
        "level": "C1",
        "title": "Инверсия после отрицаний",
        "rule": "После never, rarely, hardly, not only в начале предложения часто требуется вспомогательный глагол перед подлежащим.",
        "formula": "Never have I seen...",
        "example": "Never have I seen this before.",
        "translation": "Никогда раньше такого не видел.",
        "mistake": "Never I have seen — порядок неверен.",
        "quiz": {
          "question": "Never ___ I felt so happy.",
          "options": [
            "have",
            "I have",
            "did have"
          ],
          "answer": 0
        }
      },
      {
        "id": "cleft",
        "level": "C1",
        "title": "Выделительные конструкции",
        "rule": "It is/was ... that/who выделяет часть высказывания; What ... is/was — другой способ фокусирования.",
        "formula": "It was Tom who called",
        "example": "It was John who won.",
        "translation": "Именно Джон победил.",
        "mistake": "It John was who won — неверно.",
        "quiz": {
          "question": "___ Mary who called.",
          "options": [
            "It was",
            "There was",
            "Was it the"
          ],
          "answer": 0
        }
      },
      {
        "id": "fronting",
        "level": "C1",
        "title": "Fronting / topicalisation",
        "rule": "Дополнение или обстоятельство может выноситься в начало для тематического выделения, особенно в литературной речи.",
        "formula": "This book, I loved",
        "example": "That book I really enjoyed.",
        "translation": "Та книга мне очень понравилась.",
        "mistake": "Такой порядок маркирован и не универсален.",
        "quiz": {
          "question": "Нейтральный порядок:",
          "options": [
            "This book I read.",
            "I read this book.",
            "Read I this book."
          ],
          "answer": 1
        }
      },
      {
        "id": "ellipsis",
        "level": "C1",
        "title": "Эллипсис и замещение",
        "rule": "Повторяющиеся слова можно опускать или заменять one, so, do so. После вспомогательного глагола возможно опускать смысловой.",
        "formula": "I can, and she can too",
        "example": "I like tea, and she does too.",
        "translation": "Я люблю чай, и она тоже.",
        "mistake": "She do too — согласование неверно.",
        "quiz": {
          "question": "He can swim, and I ___ too.",
          "options": [
            "do",
            "am",
            "can"
          ],
          "answer": 2
        }
      },
      {
        "id": "parallel",
        "level": "B2",
        "title": "Параллельные конструкции",
        "rule": "Элементы списка и сопоставления должны быть грамматически согласованы: reading, writing and speaking.",
        "formula": "reading, writing and speaking",
        "example": "She enjoys hiking and swimming.",
        "translation": "Ей нравится ходить в походы и плавать.",
        "mistake": "Hiking and to swim — нежелательная несогласованность.",
        "quiz": {
          "question": "He likes reading and ___.",
          "options": [
            "writing",
            "to write",
            "write"
          ],
          "answer": 0
        }
      },
      {
        "id": "neither",
        "level": "B2",
        "title": "Neither / nor / either",
        "rule": "Neither ... nor для двух отрицательных альтернатив; either ... or для выбора. В инверсии согласование с ближайшим субъектом часто важно.",
        "formula": "neither A nor B",
        "example": "Neither Tom nor Jane was there.",
        "translation": "Ни Тома, ни Джейн там не было.",
        "mistake": "Neither Tom or Jane — неверный союз.",
        "quiz": {
          "question": "___ he nor she knew.",
          "options": [
            "Either",
            "Neither",
            "Both"
          ],
          "answer": 1
        }
      },
      {
        "id": "advancedcomparison",
        "level": "C1",
        "title": "The more ... the more",
        "rule": "Параллельная сравнительная конструкция показывает зависимость изменений: the more..., the better....",
        "formula": "the + comparative, the + comparative",
        "example": "The harder you work, the more you learn.",
        "translation": "Чем усерднее работаешь, тем больше узнаёшь.",
        "mistake": "More hard you work — не хватает the.",
        "quiz": {
          "question": "The ___ you practice, the better.",
          "options": [
            "more",
            "most",
            "much"
          ],
          "answer": 0
        }
      },
      {
        "id": "nominalisation",
        "level": "C1",
        "title": "Номинализация",
        "rule": "В формальной речи идеи часто выражают существительными вместо глаголов: decide → decision; analyse → analysis. Важно не терять смысл и субъект.",
        "formula": "decide → decision",
        "example": "Her decision surprised us.",
        "translation": "Её решение нас удивило.",
        "mistake": "Decision of her made — неестественный порядок.",
        "quiz": {
          "question": "The ___ was unexpected.",
          "options": [
            "decide",
            "decision",
            "deciding of her"
          ],
          "answer": 1
        }
      }
    ]
  }
]);
export const GRAMMAR_LESSONS = Object.freeze(GRAMMAR_GROUPS.flatMap(group =>
  group.lessons.map((lesson,index)=>Object.freeze({...lesson,groupId:group.id,groupTitle:group.title,index}))
));
export const GRAMMAR_LEVELS = Object.freeze(['A1','A2','B1','B2','C1']);
