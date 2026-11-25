// ==========================================
// 1. CONSTANTES GLOBAIS
// ==========================================
const CHAVE_USUARIOS = "cybertoys_usuarios";
const CHAVE_TOYS = "cybertoys_anuncios";
const CHAVE_SESSAO = "cybertoys_usuario_logado";

// ==========================================
// 2. FUNÇÕES AUXILIARES
// ==========================================

// Lê e salva listas no Local Storage
function lerLista(chave) {
    const dados = localStorage.getItem(chave);
    if (!dados) return [];
    try {
        return JSON.parse(dados);
    } catch (erro) {
        return [];
    }
}

function salvarLista(chave, lista) {
    localStorage.setItem(chave, JSON.stringify(lista));
}

// Lê e salva o usuário logado na sessão local
function obterUsuarioLogado() {
    const dados = localStorage.getItem(CHAVE_SESSAO);
    if (!dados) return null;
    try {
        return JSON.parse(dados);
    } catch (erro) {
        return null;
    }
}

// Remove acentos e troca símbolos não suportados pela fonte Cybertroniana
// Palavras como Procura-se não existem em Cybertroniano portanto deixarei o que seria equivalente na linguagem ao mudar idioma
function formatarParaCybertroniano(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove todos os acentos (á, ç, õ, etc.)
		.replace(/[•|—]/g, " ")			// Troca bolinha, travessão e barra vertical por espaço
        .replace(/→/g, ">")              // Troca seta por sinal de maior
        .replace(/©/g, "(C)")           // Troca símbolo de copyright
		.replace(/[@?!:]/g, "")         // Remove @, ?, ! e :
		.replace(/procura-se/gi, "se procura") //Em Cybertroniano nao existe a palavra Procura-se
		.replace(/R\$/g, "Shanix"); // Troca R$ por Shanix, moeda de Cybertron
}

// Percorre todos os textos da página, salva o original e aplica ou restaura
function atualizarTextosIdioma(ativo) {
    const arvoreTextos = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
    );

    let no;
    while ((no = arvoreTextos.nextNode())) {
        // Ignora espaços vazios, scripts e o próprio botão de idioma
        if (!no.nodeValue.trim()) continue;
        if (no.parentElement && (no.parentElement.tagName === "SCRIPT" || no.parentElement.id === "alternarIdioma")) {
            continue;
        }

        // Guarda o texto original em português na primeira vez
        if (no.textoOriginal === undefined) {
            no.textoOriginal = no.nodeValue;
        }

        no.nodeValue = ativo 
            ? formatarParaCybertroniano(no.textoOriginal) 
            : no.textoOriginal;
    }

    // Também limpa dos campos de busca/formulário
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(function (campo) {
        if (!campo.dataset.placeholderOriginal) {
            campo.dataset.placeholderOriginal = campo.placeholder;
        }
        campo.placeholder = ativo
            ? formatarParaCybertroniano(campo.dataset.placeholderOriginal)
            : campo.dataset.placeholderOriginal;
    });
}

// ==========================================
// 3. CONTROLES DA INTERFACE (TEMA E IDIOMA)
// ==========================================

// Alterna o tema e guarda a escolha no navegador.
const botaoTema = document.getElementById("alternarTema");
if (botaoTema) {
    if (localStorage.getItem("cybertoys_tema") === "escuro") {
        document.body.classList.add("tema-escuro");
        botaoTema.textContent = "☀️";
    }
    botaoTema.addEventListener("click", function () {
        document.body.classList.toggle("tema-escuro");
        const tema = document.body.classList.contains("tema-escuro") ? "escuro" : "claro";
        localStorage.setItem("cybertoys_tema", tema);
        botaoTema.textContent = tema === "escuro" ? "☀️" : "🌙";
    });
}

// Alterna entre Português e Cybertroniano e guarda a escolha no navegador.
const botaoIdioma = document.getElementById("alternarIdioma");
if (botaoIdioma) {
    if (localStorage.getItem("cybertoys_idioma") === "cybertroniano") {
        document.body.classList.add("idioma-cybertroniano");
        botaoIdioma.textContent = "PT";
        atualizarTextosIdioma(true);
    }

    botaoIdioma.addEventListener("click", function () {
        document.body.classList.toggle("idioma-cybertroniano");
        const ativo = document.body.classList.contains("idioma-cybertroniano");
        localStorage.setItem("cybertoys_idioma", ativo ? "cybertroniano" : "pt");
        botaoIdioma.textContent = ativo ? "PT" : "🌐";
        atualizarTextosIdioma(ativo);
    });
}

// ==========================================
// 4. CADASTRO E LOGIN DE USUÁRIOS
// ==========================================

// Cadastro de conta: salva no Local Storage e direciona ao login.
const formCadastro = document.getElementById("formCadastro");
if (formCadastro) {
    formCadastro.addEventListener("submit", function (evento) {
        evento.preventDefault();
        const dados = new FormData(formCadastro);
        const senha = dados.get("senha");

        if (senha.length < 6) {
            document.getElementById("mensagemCadastro").textContent = "A senha deve ter pelo menos 6 caracteres.";
            return;
        }

        // Salva o novo usuário na mesma chave usada pelo Admin
        const usuarios = lerLista(CHAVE_USUARIOS);
        usuarios.push({
            id: Date.now().toString(),
            nome: dados.get("nome") || dados.get("nomeCompleto"),
            email: dados.get("email"),
            contato: dados.get("telefone") || dados.get("whatsapp") || dados.get("contato") || "",
            senha: senha,
            data: new Date().toLocaleString("pt-BR")
        });
        salvarLista(CHAVE_USUARIOS, usuarios);

        document.getElementById("mensagemCadastro").textContent = "Cadastro realizado! Redirecionando para o login...";
        formCadastro.reset();
        setTimeout(function () { window.location.href = "login.html"; }, 1200);
    });
}

// Login local: valida contra os usuários salvos e inicia sessão no navegador.
const formLogin = document.getElementById("formLogin");
if (formLogin) {
    formLogin.addEventListener("submit", function (evento) {
        evento.preventDefault();
        const dados = new FormData(formLogin);
        const email = (dados.get("email") || "").trim().toLowerCase();
        const senha = dados.get("senha") || "";
        const mensagemLogin = document.getElementById("mensagemLogin");

        const usuarios = lerLista(CHAVE_USUARIOS);
        const usuarioEncontrado = usuarios.find(function (u) {
            return (u.email || "").trim().toLowerCase() === email && (!u.senha || u.senha === senha);
        });

        if (!usuarioEncontrado) {
            mensagemLogin.textContent = "E-mail ou senha incorretos, ou conta ainda não cadastrada.";
            return;
        }

        localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioEncontrado));
        mensagemLogin.textContent = "Login realizado! Redirecionando para anunciar...";
        setTimeout(function () { window.location.href = "anunciar.html"; }, 1000);
    });
}

// ==========================================
// 5. ANÚNCIOS DE TOYS (CADASTRO E VITRINE)
// ==========================================

// Prévia e cadastro de anúncios de Transformers (exige login).
const formToy = document.getElementById("formToy");
if (formToy) {
    const usuarioLogado = obterUsuarioLogado();

    if (!usuarioLogado) {
        alert("Você precisa fazer login para cadastrar um toy.");
        window.location.href = "login.html";
    } else {
        const fotoToy = document.getElementById("fotoToy");
        const previaFoto = document.getElementById("previaFoto");
        fotoToy.addEventListener("change", function () {
            const arquivo = fotoToy.files[0];
            if (!arquivo) {
                previaFoto.hidden = true;
                previaFoto.removeAttribute("src");
                return;
            }
            const leitor = new FileReader();
            leitor.onload = function () {
                previaFoto.src = leitor.result;
                previaFoto.hidden = false;
            };
            leitor.readAsDataURL(arquivo);
        });

        formToy.addEventListener("submit", function (evento) {
            evento.preventDefault();
            const dados = new FormData(formToy);
            const arquivo = fotoToy.files[0];
            const salvarAnuncio = function (foto) {
                const anuncios = lerLista(CHAVE_TOYS);
                anuncios.push({
                    id: Date.now().toString(),
                    nome: dados.get("nome"),
                    personagem: dados.get("personagem"),
                    fabricante: dados.get("fabricante"),
                    linha: dados.get("linha"),
                    tipo: dados.get("tipo"),
                    preco: dados.get("preco"),
                    estado: dados.get("estado"),
                    condicao: dados.get("condicao"),
                    defeitos: dados.get("defeitos"),
                    descricao: dados.get("descricao"),
                    foto: foto,
                    vendedorNome: usuarioLogado.nome,
                    vendedorEmail: usuarioLogado.email,
                    vendedorContato: usuarioLogado.contato || ""
                });
                salvarLista(CHAVE_TOYS, anuncios);
                document.getElementById("mensagemToy").textContent = "Anúncio publicado! Ele já pode aparecer na vitrine.";
                formToy.reset();
                previaFoto.hidden = true;
                previaFoto.removeAttribute("src");
            };
            if (arquivo) {
                if (arquivo.size > 1500000) {
                    document.getElementById("mensagemToy").textContent = "A imagem deve ter no máximo 1,5 MB para armazenamento local.";
                    return;
                }
                const leitor = new FileReader();
                leitor.onload = function () { salvarAnuncio(leitor.result); };
                leitor.readAsDataURL(arquivo);
            } else {
                salvarAnuncio("");
            }
        });
    }
}

// Cria a janela flutuante (modal) para exibir os detalhes completos do Toy
function abrirDetalhesToy(toy) {
    let modal = document.getElementById("modalDetalhesToy");
    if (!modal) {
        modal = document.createElement("dialog");
        modal.id = "modalDetalhesToy";
        modal.style.maxWidth = "760px";
        modal.style.width = "90%";
        modal.style.border = "0";
        modal.style.borderRadius = "12px";
        modal.style.padding = "24px";
        modal.style.boxShadow = "0 16px 40px rgba(0, 0, 0, 0.35)";
        document.body.appendChild(modal);
    }

    const precoTexto = toy.preco
        ? "R$ " + Number(toy.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
        : "Troca / Negociar";

    const contatoExtra = toy.vendedorContato ? ` | Tel/WhatsApp: ${toy.vendedorContato}` : "";

    modal.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <h2 style="margin:0;">${toy.nome}</h2>
            <button type="button" id="fecharModalToy" class="botao botao-neutro">Fechar</button>
        </div>
        <img src="${toy.foto || "https://placehold.co/700x450/0b2545/ffffff?text=Transformer"}"
             alt="Foto de ${toy.nome}"
             style="width:100%; max-height:900px; object-fit:cover; border-radius:8px; margin-bottom:14px;">
        <p><strong>Modalidade:</strong> ${toy.tipo} — <strong>Valor:</strong> ${precoTexto}</p>
        <p><strong>Personagem:</strong> ${toy.personagem || "Não informado"} | <strong>Linha:</strong> ${toy.linha}</p>
        <p><strong>Fabricante:</strong> ${toy.fabricante} | <strong>Estado:</strong> ${toy.estado} (${toy.condicao})</p>
        <p><strong>Defeitos / Observações:</strong> ${toy.defeitos || "Nenhum defeito relatado."}</p>
        <p><strong>Descrição:</strong> ${toy.descricao || "Sem descrição adicional."}</p>
        <hr style="border:0; border-top:1px solid #dce3eb; margin:16px 0;">
        <div style="background:#f2f5f8; padding:12px; border-radius:8px; color:#202b38;">
            <strong>Anunciante:</strong> ${toy.vendedorNome || "Usuário CyberToys"}<br>
            <strong>Contato:</strong> ${toy.vendedorEmail || "Não informado"}${contatoExtra}
        </div>
    `;

    document.getElementById("fecharModalToy").addEventListener("click", function () {
        modal.close();
    });

    modal.showModal();
    if (document.body.classList.contains("idioma-cybertroniano")) {
        atualizarTextosIdioma(true);
    }
}

// Vitrine: carrega os anúncios gravados localmente e permite pesquisar/filtrar.
const listaToys = document.getElementById("listaToys");
if (listaToys) {
    const anunciosSalvos = lerLista(CHAVE_TOYS);
    anunciosSalvos.forEach(function (toy) {
        const card = document.createElement("article");
        card.className = "card-toy";
        card.style.cursor = "pointer";
        card.title = "Clique para ver detalhes e contato do anunciante";

        const imagem = document.createElement("img");
        imagem.alt = "Foto do Transformer " + toy.nome;
        imagem.src = toy.foto || "https://placehold.co/700x450/0b2545/ffffff?text=Transformer";

        const conteudo = document.createElement("div");
        conteudo.className = "card-conteudo";

        const etiqueta = document.createElement("span");
        etiqueta.className = toy.tipo.toLowerCase().includes("troca") ? "tag-troca" : "tag-venda";
        etiqueta.textContent = toy.tipo;

        const titulo = document.createElement("h3");
        titulo.textContent = toy.nome;

        const linha = document.createElement("p");
        linha.textContent = toy.linha + " • " + toy.fabricante;

        const estado = document.createElement("p");
        estado.className = "estado";
        estado.textContent = "Estado: " + toy.estado + " | " + toy.condicao;

        const preco = document.createElement("strong");
        preco.textContent = toy.preco ? "R$ " + Number(toy.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "Negociar";

        conteudo.append(etiqueta, titulo, linha, estado, preco);
        card.append(imagem, conteudo);

        card.addEventListener("click", function () {
            abrirDetalhesToy(toy);
        });

        listaToys.appendChild(card);
    });

    if (document.body.classList.contains("idioma-cybertroniano")) {
        atualizarTextosIdioma(true);
    }

    const pesquisaToy = document.getElementById("pesquisaToy");
    const filtroTipo = document.getElementById("filtroTipo");
    const mensagemVazia = document.getElementById("mensagemVazia");
    function filtrarAnuncios() {
        const termo = pesquisaToy.value.toLowerCase().trim();
        const tipo = filtroTipo.value;
        const cards = Array.from(listaToys.children);
        let visiveis = 0;
        cards.forEach(function (card) {
            const texto = card.textContent.toLowerCase();
            const correspondeTexto = texto.includes(termo);
            const correspondeTipo = tipo === "todos" || card.textContent.includes(tipo);
            card.hidden = !(correspondeTexto && correspondeTipo);
            if (!card.hidden) visiveis++;
        });
        mensagemVazia.hidden = visiveis > 0;
    }
    pesquisaToy.addEventListener("input", filtrarAnuncios);
    filtroTipo.addEventListener("change", filtrarAnuncios);
}

// ==========================================
// 6. PAINEL ADMINISTRATIVO (USUÁRIOS E TOYS)
// ==========================================

// Administração: cadastro, listagem, pesquisa e exclusão de usuários.
const formAdmin = document.getElementById("formAdmin");
if (formAdmin) {
    const campoNome = document.getElementById("nomeAdmin");
    const campoEmail = document.getElementById("emailAdmin");
    const listaUsuarios = document.getElementById("listaUsuarios");
    const pesquisaAdmin = document.getElementById("pesquisaAdmin");
    const semUsuarios = document.getElementById("semUsuarios");
    const mensagemAdmin = document.getElementById("mensagemAdmin");

    function mostrarUsuarios() {
        const usuarios = lerLista(CHAVE_USUARIOS);
        const termo = pesquisaAdmin.value.trim().toLowerCase();
        const encontrados = usuarios.filter(function (usuario) {
            return usuario.nome.toLowerCase().includes(termo) || usuario.email.toLowerCase().includes(termo);
        });
        listaUsuarios.innerHTML = "";
        encontrados.forEach(function (usuario) {
            const item = document.createElement("li");
            const botaoExcluir = document.createElement("button");
            botaoExcluir.type = "button";
            botaoExcluir.className = "botao botao-perigo";
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.addEventListener("click", function () {
                const atualizados = lerLista(CHAVE_USUARIOS).filter(function (registro) {
                    return registro.id !== usuario.id;
                });
                salvarLista(CHAVE_USUARIOS, atualizados);
                mensagemAdmin.textContent = "Usuário excluído.";
                mostrarUsuarios();
            });
            const texto = document.createElement("strong");
            texto.textContent = usuario.nome + " — " + usuario.email;
            const data = document.createElement("span");
            data.textContent = "Enviado em: " + usuario.data;
            item.appendChild(botaoExcluir);
            item.appendChild(texto);
            item.appendChild(data);
            listaUsuarios.appendChild(item);
        });
        semUsuarios.hidden = encontrados.length > 0;
        if (usuarios.length > 0 && encontrados.length === 0) semUsuarios.textContent = "Nenhum resultado para essa pesquisa.";
        else semUsuarios.textContent = "Nenhum usuário cadastrado.";
    }

    formAdmin.addEventListener("submit", function (evento) {
        evento.preventDefault();
        const nome = campoNome.value.trim();
        const email = campoEmail.value.trim();
        if (!nome || !email) return;
        const usuarios = lerLista(CHAVE_USUARIOS);
        usuarios.push({
            id: Date.now().toString(),
            nome: nome,
            email: email,
            data: new Date().toLocaleString("pt-BR")
        });
        salvarLista(CHAVE_USUARIOS, usuarios);
        formAdmin.reset();
        mensagemAdmin.textContent = "Usuário cadastrado com sucesso!";
        mostrarUsuarios();
    });

    document.getElementById("limparAdmin").addEventListener("click", function () {
        formAdmin.reset();
        mensagemAdmin.textContent = "Campos limpos.";
    });
    document.getElementById("excluirTodos").addEventListener("click", function () {
        if (confirm("Deseja realmente excluir todos os usuários?")) {
            localStorage.removeItem(CHAVE_USUARIOS);
            mensagemAdmin.textContent = "Todos os usuários foram excluídos.";
            mostrarUsuarios();
        }
    });
    pesquisaAdmin.addEventListener("input", mostrarUsuarios);
    mostrarUsuarios();
}

// Gerenciamento de Toys na área administrativa
const listaToysAdmin = document.getElementById("listaToysAdmin");
if (listaToysAdmin) {
    const semToysAdmin = document.getElementById("semToysAdmin");
    const mensagemAdmin = document.getElementById("mensagemAdmin");

    function mostrarToysAdmin() {
        const toys = lerLista(CHAVE_TOYS);
        listaToysAdmin.innerHTML = "";

        toys.forEach(function (toy) {
            const item = document.createElement("li");

            const botaoExcluir = document.createElement("button");
            botaoExcluir.type = "button";
            botaoExcluir.className = "botao botao-perigo";
            botaoExcluir.textContent = "Excluir";
            botaoExcluir.addEventListener("click", function () {
                const atualizados = lerLista(CHAVE_TOYS).filter(function (registro) {
                    return registro.id !== toy.id;
                });
                salvarLista(CHAVE_TOYS, atualizados);
                if (mensagemAdmin) mensagemAdmin.textContent = "Anúncio excluído.";
                mostrarToysAdmin();
            });

            const texto = document.createElement("strong");
            const precoFormatado = toy.preco ? "R$ " + Number(toy.preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "Troca / Negociar";
            texto.textContent = toy.nome + " (" + toy.tipo + ") — " + precoFormatado;

            const detalhes = document.createElement("span");
            detalhes.textContent = "Fabricante: " + toy.fabricante + " | Estado: " + toy.estado;

            item.appendChild(botaoExcluir);
            item.appendChild(texto);
            item.appendChild(detalhes);
            listaToysAdmin.appendChild(item);
        });

        semToysAdmin.hidden = toys.length > 0;
    }

    document.getElementById("excluirTodosToys").addEventListener("click", function () {
        if (confirm("Deseja realmente excluir todos os anúncios cadastrados?")) {
            localStorage.removeItem(CHAVE_TOYS);
            if (mensagemAdmin) mensagemAdmin.textContent = "Todos os anúncios foram excluídos.";
            mostrarToysAdmin();
        }
    });

    mostrarToysAdmin();
}
