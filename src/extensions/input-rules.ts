import { Extension, InputRule, textInputRule } from "@tiptap/core";

const DateInputRules = Extension.create({
  name: "dateInputRules",

  addInputRules() {
    return [
      new InputRule({
        find: /((?:^|\s))@(today|tomorrow|yesterday)\s$/i,
        handler: ({ match, range, commands }) => {
          if (
            !match ||
            typeof match[1] !== "string" ||
            typeof match[2] !== "string"
          ) {
            return null;
          }
          const prefixWhitespace = match[1];
          const command = match[2].toLowerCase();
          const targetDate = new Date();
          if (command === "tomorrow") {
            targetDate.setDate(targetDate.getDate() + 1);
          } else if (command === "yesterday") {
            targetDate.setDate(targetDate.getDate() - 1);
          }
          const formatter = new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
          });
          const formattedDate = formatter.format(targetDate);
          if (range.from < 0 || range.to < range.from) return null;
          commands.insertContentAt(
            { from: range.from, to: range.to },
            `${prefixWhitespace}${formattedDate} `,
          );
          return;
        },
      }),
    ];
  },
});

const InputRules = Extension.create({
  name: "inputRules",

  addInputRules() {
    return [
      textInputRule({ find: /--$/, replace: "—" }),
      textInputRule({ find: /<-$/, replace: "←" }),
      textInputRule({ find: /->$/, replace: "→" }),
      textInputRule({ find: /<<$/, replace: "«" }),
      textInputRule({ find: />>$/, replace: "»" }),
      textInputRule({ find: /\+\/-$/, replace: "±" }),
      textInputRule({ find: /!=$/, replace: "≠" }),
      textInputRule({ find: /=>$/, replace: "⇒" }),
      textInputRule({ find: /\(c\)$/i, replace: "©" }),
      textInputRule({ find: /\(r\)$/i, replace: "®" }),
      textInputRule({ find: /\(tm\)$/i, replace: "™" }),
      textInputRule({ find: /(\d)deg$/, replace: "$1°" }),
      textInputRule({ find: /1\/2$/, replace: "½" }),
      textInputRule({ find: /1\/3$/, replace: "⅓" }),
      textInputRule({ find: /2\/3$/, replace: "⅔" }),
      textInputRule({ find: /1\/4$/, replace: "¼" }),
      textInputRule({ find: /3\/4$/, replace: "¾" }),
      textInputRule({ find: /1\/5$/, replace: "⅕" }),
      textInputRule({ find: /2\/5$/, replace: "⅖" }),
      textInputRule({ find: /3\/5$/, replace: "⅗" }),
      textInputRule({ find: /4\/5$/, replace: "⅘" }),
      textInputRule({ find: /1\/6$/, replace: "⅙" }),
      textInputRule({ find: /5\/6$/, replace: "⅚" }),
      textInputRule({ find: /1\/7$/, replace: "⅐" }),
      textInputRule({ find: /1\/8$/, replace: "⅛" }),
      textInputRule({ find: /3\/8$/, replace: "⅜" }),
      textInputRule({ find: /5\/8$/, replace: "⅝" }),
      textInputRule({ find: /7\/8$/, replace: "⅞" }),
      textInputRule({ find: /1\/9$/, replace: "⅑" }),
      textInputRule({ find: /1\/10$/, replace: "⅒" }),
    ];
  },
});

export { DateInputRules, InputRules };
