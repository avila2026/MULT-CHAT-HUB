# Changelog

## 4 de agosto de 2026 — 1.25927.0

### Novo

- Adicionado um chevron ao lado do botão de microfone do compositor que alterna entre ditado e modo de voz e mantém a sua escolha; clicar no microfone agora inicia o ditado imediatamente.
- Adicionada retomada automática de sessões interrompidas quando o computador entra em suspensão. Um banner com um botão manual "Continuar" aparece apenas quando a retomada não é segura, e você pode continuar a sessão na nuvem.
- Adicionadas a captura e a anotação da página exibida no painel do Navegador, incluindo sites externos, para que você possa marcar o que vê e anexar a imagem à conversa.

### Corrigido

- Corrigido o app ficar sem nenhuma janela utilizável: uma falha durante a inicialização agora exibe uma caixa de diálogo de erro e registra os detalhes em um arquivo, e uma janela encerrada pelo sistema por falta de memória é recarregada em vez de ficar em branco.
- Corrigida uma falha no macOS durante os prompts de passkey e Touch ID quando o idioma do sistema é alemão, espanhol, francês, híndi, indonésio, italiano, japonês ou coreano.
- Corrigidas as reinicializações de atualização automáticas e acionadas pelo menu interromperem uma tarefa do Claude Code ou do Cowork em andamento.
- Corrigida a busca com Ctrl+K deixando de fora resultados da saída de ferramentas e de sessões arquivadas.
- Corrigidas mensagens enviadas enquanto o Claude trabalhava desaparecerem de uma sessão depois que ela era recarregada do disco.
- Corrigidas sessões que às vezes se tornavam permanentemente impossíveis de abrir, exibindo "Nenhuma mensagem ainda" enquanto o histórico da conversa continuava no disco.
- Corrigido o travamento ao iniciar uma sessão e ao trocar de repositório em organizações com listas de repositórios muito grandes: os seletores agora carregam os repositórios página por página, encontram os demais conforme você digita, informam quando há mais disponíveis por meio da busca e relatam uma busca com falha em vez de exibir resultados vazios.
- Corrigida uma falha ao usar o navegador integrado em páginas com muita atividade de console ou de rede.

## 21 de julho de 2026 — 1.24012.0

### Novo

- Adicionada uma opção para manter marketplaces de plugins personalizados atualizados automaticamente, e corrigidos uma atualização de marketplace relatar sucesso antes da sincronização ser executada e a readição de um marketplace existente não atualizar seu conteúdo.
- Adicionado suporte ao Simulador do iOS: o Claude Code pode compilar seu app iOS, iniciar o simulador e verificar o resultado sem sair da sessão.
- Adicionados botões do Simulador do iOS e do Emulador do Android à barra de título da sessão quando o agente inicia um app em um dispositivo, deixando o painel a um clique de ser reaberto.
- Adicionada anotação de capturas de tela no compositor: clique em uma imagem preparada, abra o lápis e desenhe com caneta, formas, texto e cores antes de enviar.
- Adicionado o Pausar Projeto, que pausa o coordenador de um projeto e a criação de novas sessões nas configurações e exibe um banner "Retomar" acima do compositor.

### Aprimorado

- Melhorado o suporte a teclado e leitores de tela em todo o app: as abas de configurações e as opções de visibilidade de compartilhamento respondem às setas do teclado, as caixas de diálogo anunciam títulos significativos, gráficos decorativos não poluem mais a saída dos leitores de tela, e a barra de busca, os campos de pesquisa e as alças de redimensionamento de painéis exibem um contorno de foco visível e anunciam seu tamanho.
- Melhorada a abertura de sessões grandes: as mensagens mais recentes são exibidas primeiro enquanto o histórico mais antigo carrega em segundo plano.

### Corrigido

- Corrigido o app não iniciar quando seu arquivo de configurações ou a pasta de logs estavam corrompidos, e sessões salvas desaparecerem após uma reinicialização quando os dados armazenados de uma sessão eram inválidos.
- Corrigida a janela do app redimensionar-se abruptamente e perder o tamanho e a posição salvos ao entrar ou sair da conta; agora ela é animada suavemente no lugar.
- Corrigidos uploads com falha serem relatados como arquivos corrompidos ou não suportados, e novas tentativas exibirem a mensagem "O servidor está ocupado" para erros não relacionados.
- Corrigidos avisos de bloqueio de segurança sugerirem trocar de modelo quando não havia modelo alternativo disponível para aquele tema.
- Corrigidas sessões do Code afetarem os arquivos errados: a limpeza de worktrees em segundo plano podia trocar ou redefinir o checkout do repositório principal quando uma pasta de worktree era removida apenas parcialmente, e novas sessões podiam copiar arquivos não commitados da pasta original.
- Corrigidos problemas na lista de sessões: sessões finalizadas ainda apareciam como em execução, sessões excluídas reapareciam como entradas vazias "Sessão não encontrada no disco" após uma atualização, sessões arquivadas continuavam aparecendo como ativas no claude.ai e em outros dispositivos, e sessões iniciadas pelo claude.ai não tinham Renomear, Arquivar e Excluir no menu da barra lateral.
- Corrigidos o app congelar quando o Claude Code atualizava seu arquivo de configuração durante uso simultâneo, e páginas web no painel do Navegador congelarem o app com caixas de diálogo `alert` e `confirm`.

## 19 de julho de 2026 — 1.22209.3

### Corrigido

- Corrigidas sessões no Windows falharem a cada turno com um erro `Socket is closed` quando o tráfego passava por um proxy corporativo que inspeciona conexões criptografadas, por meio da atualização do CLI do Claude Code incluído para a versão 2.1.215. Respostas interrompidas agora são repetidas em uma nova conexão em vez de encerrar o turno.

## 16 de julho de 2026 — 1.22209.0

### Novo

- Adicionadas ações por linha às mensagens em fila (Editar no compositor, Enviar agora e Remover), com suporte a clique com o botão direito.
- Adicionados controles para que proprietários de projetos removam membros de um projeto compartilhado e copiem um link de convite na caixa de diálogo de membros.

### Aprimorado

- Melhorado o menu "Adicionar ao projeto" para exibir apenas os projetos para os quais você pode mover, com seus próprios projetos listados primeiro.
- Melhorada a responsividade durante a geração de artefatos, mantendo a digitação e a rolagem fluidas.

### Corrigido

- Corrigidos travamentos raros quando uma transcrição continha mensagens ou saídas de ferramentas muito grandes preenchidas com espaços em branco.
- Corrigidos erros de ferramentas culparem uma política da organização quando, na verdade, o site estava bloqueado pelas suas próprias permissões de site ou configurações.
- Corrigidos o botão "Nova sessão", o Ctrl+N e o "+" do cabeçalho do projeto descartarem um rascunho não enviado do compositor.
- Corrigida uma nova sessão às vezes assumir o diretório em que outra sessão ainda estava trabalhando.
- Corrigidos sessões do Code travarem na inicialização quando a sincronização de skills estava lenta, e ferramentas no `PATH` do seu shell não serem detectadas quando a detecção do ambiente do shell expirava na inicialização.
- Corrigidos congelamentos, um indicador de "carregando mensagens anteriores" preso e renderização em branco ao rolar por transcrições de sessão muito grandes ou quando a saída de uma tarefa em execução crescia muito.

## 16 de julho de 2026 — 1.21459.3

### Corrigido

- Corrigidas extensões instaladas não carregarem e exibirem um estado de carregamento infinito.

## 14 de julho de 2026 — 1.21459.0

### Novo

- Adicionada a possibilidade de fixar artefatos pela galeria ou pelo visualizador de artefatos e de filtrar a galeria pelos seus artefatos fixados.
- Adicionada uma barra de endereços no estilo de navegador ao painel de pré-visualização, e uma mensagem clara, com a opção de abrir o site no seu navegador, quando uma página não pode ser exibida, em vez de mostrar uma página em branco.

### Aprimorado

- Alterado o prompt de permissão de busca na web para usar "Permitir tudo para este site" como padrão quando essa concessão está disponível; "Permitir uma vez" continua sendo o padrão nos demais casos, e pressionar Enter sempre responde "Permitir uma vez".
- Atualizado o mecanismo do Claude Code incorporado para a versão mais recente.
- Melhorado o tratamento de conexões de sessões SSH: as mensagens não travam mais depois que o computador sai da suspensão, as sessões se recuperam de desconexões repetidas e um indicador de reconexão aparece enquanto a conexão é restabelecida.

### Corrigido

- Corrigidas exportações de sessão que podiam gerar um arquivo compactado sem a transcrição; a transcrição agora é sempre incluída como `transcript.jsonl`, e a exportação exibe um erro claro quando não é possível incluí-la.
- Corrigida uma falha na inicialização quando o arquivo de controle de worktrees do Claude não podia ser lido ou gravado.
- Corrigidos breves congelamentos do app ao abrir terminais ou trocar de sessão no Windows, e quando o menu de menções com @ atualizava a lista de janelas abertas.
- Corrigido o aviso "Entrar novamente" não aparecer quando uma sessão em segundo plano era bloqueada por atualidade de sessão, inclusive com a área de trabalho ociosa.
- Corrigidas tarefas agendadas e rotinas: editar uma rotina não exclui mais seu agendamento único, "Executar agora" não deixa mais de funcionar silenciosamente até o app ser reiniciado, e agora é possível renomear rotinas e tarefas agendadas pela caixa de diálogo de edição.
- Corrigidos vários problemas de confiabilidade de sessão: uma sessão podia ficar presa exibindo "em execução" e enfileirar novas mensagens indefinidamente, uma sessão recém-iniciada podia sumir da barra lateral ou exibir "sessão não pôde ser encontrada" durante a inicialização, e respostas transmitidas podiam ser interrompidas ou exibir um literal "undefined".
- Corrigidas trocas de branch em repositórios grandes falharem depois que o stash de alterações não commitadas expirava, e restauradas as alterações guardadas no stash quando uma troca falha.
- Corrigido o `permissions.defaultMode` nas configurações do Claude Code ser ignorado em novas sessões depois que um modo de permissão por pasta havia sido escolhido.
