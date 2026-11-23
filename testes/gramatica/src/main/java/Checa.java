import org.languagetool.JLanguageTool;
import org.languagetool.Languages;
import org.languagetool.rules.RuleMatch;
import java.nio.file.*;
import java.util.*;
public class Checa {
  public static void main(String[] a) throws Exception {
    JLanguageTool lt = new JLanguageTool(Languages.getLanguageForShortCode("pt-BR"));
    for (String linha : Files.readAllLines(Paths.get(a[0]))) {
      if (linha.isBlank()) continue;
      for (RuleMatch m : lt.check(linha)) {
        String id = m.getRule().getId();
        String trecho = linha.substring(Math.max(0, m.getFromPos() - 25), Math.min(linha.length(), m.getToPos() + 25));
        System.out.println(id + "\t" + m.getSuggestedReplacements().stream().limit(2).toList() + "\t" + trecho.replace("\t", " ") + "\t" + m.getMessage());
      }
    }
  }
}
