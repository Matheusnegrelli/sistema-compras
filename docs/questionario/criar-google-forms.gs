/**
 * Cria os dois Google Forms do questionário TAM do Provisa (equipe de compras e fornecedores)
 * e uma planilha de respostas para cada um.
 *
 * Como usar:
 * 1. Acesse https://script.google.com e clique em "Novo projeto".
 * 2. Apague o que estiver no editor, cole este arquivo inteiro e salve (Ctrl+S).
 * 3. No topo, escolha a função "criarQuestionarios" e clique em "Executar".
 * 4. Autorize o acesso à sua conta Google quando o Google pedir.
 * 5. Abra "Registro de execução": lá aparecem os links para enviar e para editar cada formulário.
 */

const TITULO = "Questionário de avaliação do Provisa";
const CONSENTIMENTO = "Sua participação é voluntária e anônima. As respostas serão usadas apenas para fins acadêmicos neste Trabalho de Conclusão de Curso, conforme a Lei Geral de Proteção de Dados (LGPD), e você pode desistir a qualquer momento.";
const ESCALA = ["Discordo totalmente", "Discordo", "Neutro", "Concordo", "Concordo totalmente"];
const PERFIL = [{"pergunta": "Qual a sua função?", "tipo": "unica", "opcoes": ["Comprador(a)", "Gestor(a) de suprimentos", "Almoxarifado", "Farmácia", "Outra"]}, {"pergunta": "Há quanto tempo trabalha com compras ou suprimentos?", "tipo": "unica", "opcoes": ["Menos de 1 ano", "1 a 3 anos", "4 a 10 anos", "Mais de 10 anos"]}, {"pergunta": "Faixa etária", "tipo": "unica", "opcoes": ["Até 24 anos", "25 a 34 anos", "35 a 44 anos", "45 anos ou mais"]}, {"pergunta": "Como você faz cotações hoje? (marque todas as opções que se aplicam)", "tipo": "varias", "opcoes": ["E-mail", "Telefone", "WhatsApp", "Planilha", "Sistema/ERP", "Outro"]}, {"pergunta": "Quanto tempo você leva, em média, do alerta de falta até aprovar a compra?", "tipo": "unica", "opcoes": ["Menos de 1 dia", "1 a 2 dias", "3 a 5 dias", "Mais de 5 dias"]}, {"pergunta": "Como avalia sua familiaridade com sistemas web?", "tipo": "unica", "opcoes": ["Baixa", "Média", "Alta"]}];
const BLOCOS_COMPRAS = [{"titulo": "Bloco B: Utilidade Percebida (UP)", "descricao": "UP1 a UP6 adaptam os seis itens originais de Davis (1989). UP7 e UP8 cobrem o apoio à decisão e a automação, que são o objetivo central do Provisa.", "itens": ["UP1. Usar o Provisa me permite concluir as cotações e compras mais rapidamente.", "UP2. Usar o Provisa melhora o meu desempenho no processo de compras.", "UP3. Usar o Provisa aumenta a minha produtividade no trabalho.", "UP4. Usar o Provisa torna as minhas decisões de compra mais eficazes.", "UP5. O Provisa torna mais fácil realizar o meu trabalho de compras.", "UP6. De modo geral, considero o Provisa útil no meu trabalho.", "UP7. O comparativo e a recomendação por pontuação me dão mais segurança para escolher o fornecedor.", "UP8. O alerta automático de estoque e o envio automático das cotações reduzem o meu trabalho manual."]}, {"titulo": "Bloco C: Facilidade de Uso Percebida (FUP)", "descricao": "Os seis itens adaptam a escala original de Davis (1989) sem acréscimos, para manter a comparabilidade com outros estudos.", "itens": ["FUP1. Aprender a usar o Provisa foi fácil para mim.", "FUP2. Consigo fazer o Provisa realizar o que eu preciso com facilidade.", "FUP3. A minha interação com o Provisa é clara e compreensível.", "FUP4. O Provisa é flexível: consigo ajustar quantidades, pesos e escolhas quando preciso.", "FUP5. Seria fácil para mim me tornar habilidoso(a) no uso do Provisa.", "FUP6. De modo geral, considero o Provisa fácil de usar."]}, {"titulo": "Bloco D: Atitude e Intenção de Uso", "descricao": "Estes itens mostram se as percepções de utilidade e facilidade se convertem em vontade de adotar o sistema.", "itens": ["AT1. Usar o Provisa no setor de compras é uma boa ideia.", "AT2. Gosto da ideia de usar o Provisa no meu trabalho.", "AT3. Usar o Provisa seria vantajoso em comparação ao processo atual (e-mail, telefone e planilha).", "IU1. Se o Provisa estivesse disponível no hospital, eu pretenderia usá-lo.", "IU2. Eu usaria o Provisa com frequência nas minhas cotações.", "IU3. Eu recomendaria o Provisa para outros profissionais de compras."]}];
const ABERTAS = ["O que você achou mais útil no Provisa?", "Em que parte do sistema você teve mais dificuldade ou dúvida?", "Houve alguma situação em que você não concordou com a proposta recomendada pelo sistema? Por quê?", "O que impediria o uso do Provisa no dia a dia do hospital?", "Que funcionalidade você acrescentaria?"];
const BLOCO_FORNECEDOR = {"titulo": "Bloco E: versão para fornecedores", "descricao": "Responda depois de enviar uma cotação pelo link recebido por e-mail.", "itens": ["F-UP1. Responder a cotação pelo link do e-mail é mais rápido do que responder por e-mail, telefone ou WhatsApp.", "F-UP2. A opção \"Não tenho\" por item facilita cotar apenas o que eu tenho em estoque.", "F-UP3. Receber o pedido de compra em PDF e a confirmação de pagamento por e-mail é útil para o meu trabalho.", "F-FUP1. O formulário de resposta é claro e fácil de preencher.", "F-FUP2. Consegui responder a cotação pelo celular sem dificuldade.", "F-FUP3. Não precisar de cadastro nem senha facilita a minha participação.", "F-IU1. Eu preferiria receber as cotações do hospital dessa forma."]};
const ABERTAS_FORNECEDOR = ["O que facilitou ou dificultou responder a cotação pelo link?", "O que você mudaria no portal de resposta?"];

function criarQuestionarios() {
  const compras = criarFormulario_(
    TITULO + " · Equipe de compras",
    "Pesquisa do TCC \"Sistema Web de Apoio à Decisão na Gestão de Compras com Integração via API e Automação de Cotações\" (Matheus Negrelli, Sistemas de Informação · UNESC). Leva cerca de 10 minutos. " +
      "Responda pensando no uso do Provisa que você acabou de fazer.",
    (form) => {
      form.addPageBreakItem().setTitle("Bloco A: perfil do respondente");
      PERFIL.forEach((p) => {
        const item = p.tipo === "varias" ? form.addCheckboxItem() : form.addMultipleChoiceItem();
        // "Outra/Outro" vira a opção "Outro" do Forms, com campo para escrever
        const temOutro = p.opcoes.some((o) => o.startsWith("Outr"));
        item.setTitle(p.pergunta).setChoiceValues(p.opcoes.filter((o) => !o.startsWith("Outr"))).setRequired(true);
        if (temOutro) item.showOtherOption(true);
      });
      BLOCOS_COMPRAS.forEach((b) => adicionarBlocoLikert_(form, b));
      form.addPageBreakItem().setTitle("Perguntas abertas").setHelpText("Opcionais, mas ajudam muito a melhorar o sistema.");
      ABERTAS.forEach((p) => form.addParagraphTextItem().setTitle(p));
    },
  );
  const fornecedores = criarFormulario_(
    TITULO + " · Fornecedores",
    "Pesquisa do TCC \"Sistema Web de Apoio à Decisão na Gestão de Compras com Integração via API e Automação de Cotações\" (Matheus Negrelli, Sistemas de Informação · UNESC). Leva cerca de 3 minutos.",
    (form) => {
      adicionarBlocoLikert_(form, BLOCO_FORNECEDOR);
      form.addPageBreakItem().setTitle("Comentários");
      ABERTAS_FORNECEDOR.forEach((p) => form.addParagraphTextItem().setTitle(p));
    },
  );
  [compras, fornecedores].forEach((r) => {
    Logger.log("%s\n  Link para enviar: %s\n  Link para editar: %s\n  Planilha de respostas: %s",
      r.form.getTitle(), r.form.getPublishedUrl(), r.form.getEditUrl(), r.planilha.getUrl());
  });
}

/** Formulário com termo de consentimento: quem não concorda é levado direto ao envio. */
function criarFormulario_(titulo, descricao, montarPerguntas) {
  const form = FormApp.create(titulo)
    .setDescription(descricao)
    .setCollectEmail(false)
    .setProgressBar(true)
    .setConfirmationMessage("Obrigado por participar! Suas respostas foram registradas.");
  const termo = form.addMultipleChoiceItem().setTitle("Termo de consentimento").setHelpText(CONSENTIMENTO).setRequired(true);
  montarPerguntas(form);
  termo.setChoices([
    termo.createChoice("Li e concordo em participar", FormApp.PageNavigationType.CONTINUE),
    termo.createChoice("Não concordo", FormApp.PageNavigationType.SUBMIT),
  ]);
  const planilha = SpreadsheetApp.create(titulo + " (respostas)");
  form.setDestination(FormApp.DestinationType.SPREADSHEET, planilha.getId());
  return { form, planilha };
}

/** Uma página por bloco; cada afirmação vira uma escala de 1 a 5 (uma coluna por item na planilha). */
function adicionarBlocoLikert_(form, bloco) {
  form.addPageBreakItem().setTitle(bloco.titulo)
    .setHelpText("Indique o quanto você concorda com cada afirmação: 1 = " + ESCALA[0] + " e 5 = " + ESCALA[4] + ".");
  bloco.itens.forEach((texto) => {
    form.addScaleItem().setTitle(texto).setBounds(1, 5).setLabels(ESCALA[0], ESCALA[4]).setRequired(true);
  });
}
