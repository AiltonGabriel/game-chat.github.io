/* Configurando os serviços do Firebase */
var firebaseConfig = {
	apiKey: "AIzaSyCOBBXS669mgLk5rgokbL-HKZlXrCThOoE",
	authDomain: "game-chat-cfe32.firebaseapp.com",
	databaseURL: "https://game-chat-cfe32.firebaseio.com",
	projectId: "game-chat-cfe32",
	storageBucket: "game-chat-cfe32.appspot.com",
	messagingSenderId: "172631930013",
	appId: "1:172631930013:web:77c3a97f5a47e037d55074",
	measurementId: "G-G4LRLG5SB8"
};

/* Inicializando o Firebase */
firebase.initializeApp(firebaseConfig);
firebase.analytics();

/* Obtendo as referências de cada serviço do Firebase utilizado na página */
var database = firebase.database();
var storage = firebase.storage();
var auth = firebase.auth();

/* Variáveis utilizadas para a autenticação e navegação */
var usuarioNaoVerificado;
var currentUser;
var currentUrl = window.location.href.substring(window.location.href.lastIndexOf('/'));

/* Configurando a persistência da sessão e o idioma da autencicação */
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
auth.languageCode = 'pt-br';

/* Criando listener que irá tratar o login e logout de cada usuário, assim como a permissão de cada página */
auth.onAuthStateChanged(function(user) {
  currentUser = user;
  if (user) {
  	if (user.emailVerified == false){
  		usuarioNaoVerificado = user;
  		logout();
  		$("#login-erro-msg").show();
		$("#login-erro-msg").html("Email não verificado! <button id='email-check-btn' onclick='sendEmailCheck(this);'>Enviar verificação</button>");
	} 
	else{
		usuarioNaoVerificado = null;
	  	// console.log("logado");
	  	if ((currentUrl == "/login.html") || (currentUrl == "/cadastro.html") || (currentUrl == "/")){
	  		window.location.replace("index.html");
	  	}

	  	$("#username").val(currentUser.displayName);
	  	$("#user-name").text(currentUser.displayName);

	  	let imageRef = storage.ref().child('users/' + currentUser.uid + '/images/avatar.png');
	  	imageRef.getDownloadURL().then(function(url) {
			$("#profile-img").attr("src",url);
			$("#user-img").attr("src",url);
		}).catch(function(error) {
			$("#profile-img").attr("src", "img/default-avatar.png");
			$("#user-img").attr("src", "img/default-avatar.png");
			if(error.code == 'storage/unauthorized'){
				alert("Sem autorização");
			}
		});
  	}
  }
  else{
  	// console.log("não logado");
  	if (((currentUrl != "/login.html") && (currentUrl != "/cadastro.html")) || (currentUrl == "/")) {
    	window.location.replace("login.html");
  	}
  }
});

/* Função que irá tratar o login com o Firebase Auth. Retorna um array com a primeira opção representando
   o sucesso da operação, e com a segunda opção representando a mensagem de erro no caso de falha. */
async function login(email, password){
	let msgErro = "";
	if((email != "") && (password != "")){
		await auth.signInWithEmailAndPassword(email, password).catch(function(error) {
			usuarioNaoVerificado = null;
			var errorCode = error.code;
			var errorMessage = error.message;
			if (errorCode == "auth/invalid-email") {
				msgErro = "O endereço de e-mail está formatado incorretamente.";
			}
			else if (errorCode == "auth/user-not-found"){
				msgErro = "Não há registro de usuário correspondente a este e-mail.";
			}
			else if (errorCode == "auth/wrong-password"){
				msgErro = "A senha está incorreta.";
			}
			else if (errorCode == "auth/too-many-requests"){
				msgErro = "O acesso a esta conta foi temporariamente desativado devido a muitas tentativas de login mal sucedidas. Você pode restaurá-lo imediatamente redefinindo sua senha ou pode tentar novamente mais tarde.";
			}
			else{
				msgErro = "Ocorreu um erro ao efetuar o login.";
			}
		});
	}
	else{
		msgErro = "Preencha todos os campos";
	}

	if (msgErro == "") {
		return [true];
	}
	else{
		return [false, msgErro];
	}
	
}

/* Função que irá tratar o cadastro no Firebase Auth. Retorna um array com a primeira opção representando
   o sucesso da operação, e com a segunda opção representando a mensagem de erro no caso de falha. */
async function cadastro(displayName, email, password, checkPassword, termosEPolitica){
	let msgErro = "";
	let validDisplayName;
	if((displayName != "") && (email != "") && (password != "") && (checkPassword != "")){
		if (termosEPolitica == true) {
			await checkDisplayName(displayName).then(function(value) {
				if(value){
					validDisplayName = true;
				}
				else{
					validDisplayName = false;
					msgErro = "O nome do usuário já está em uso!";
				}
			});
			if (validDisplayName == true) {
				if (password == checkPassword) {
					await auth.createUserWithEmailAndPassword(email, password).then(function(login){
						let user = login.user;
						user.updateProfile({displayName: displayName}).then(function() {
							database.ref('users/' + user.uid).set({'displayName': displayName});
							window.location.replace("login.html");
						}).catch(function(error) {
							alert("Ocorreu um erro ao definir seu nome de exibição!");
							// console.log(error);
						});
						user.sendEmailVerification().catch(function(error){
							alert("Erro ao enviar verificação de e-mail!");
						})
					}).catch(function(error) {
						var errorCode = error.code;
						var errorMessage = error.message;
						if (errorCode == "auth/email-already-in-use"){
							msgErro = "O endereço de e-mail já está sendo usado por outra conta!"
						}
						else if(error.code == "auth/weak-password"){
								msgErro = "A senha deve ter pelo menos 6 caracteres!"
						}
						else if (errorCode == "auth/invalid-email") {
							msgErro = "O endereço de e-mail está formatado incorretamente!";
						}
						else{
							console.log("")
							msgErro = "Ocorreu um erro ao criar o usuário!";
						}
					});
				}
				else{
					msgErro = "As senhas não são iguais!";
				}
			}
		}
		else{
			msgErro = "Você deve aceitar os Termos e Política de Privacidade!";
		}
	}
	else{
		msgErro = "Preencha todos os campos!";
	}

	if (msgErro == "") {
		return [true];
	}
	else{
		return [false, msgErro];
	}
}

/* Função que envia um e-mail para redefinição da senha. Retorna uma mensagem que indica se a operação
   foi finalizada com sucesso e uma mensagem de erro em caso de falha. */
async function sendResetPassword(email){
	var auth = firebase.auth();
	var msg;
	await auth.sendPasswordResetEmail(email).then(function() {
		msg = "Um e-mail para a redefinição da senha foi enviado!";
	}).catch(function(error) {
		msg = "Erro ao enviar e-mail de redefinição de senha!";
		if (error.code == "auth/invalid-email") {
			msg += " O endereço de e-mail está formatado incorretamente!";
		}
		else if (error.code == "auth/user-not-found"){
			msg += " Não há registro de usuário correspondente a este e-mail."
		}
	});
	return msg;
}

/* Efetua o logout no Firebase Auth. */
function logout(){
	auth.signOut().then(function() {
	  // console.log("logout");
	}).catch(function(error) {
	  // console.log("erro logout");
	  alert("Erro ao fazer o logout!");
	});
}

/* Envia a verificação de e-mail do Firebase Auth para o endereço de e-mail passado por parâmetro. */
function sendEmailCheck(btn){
	let seconds = 30;

	btn.disabled = true;
	btn.innerText = seconds 

	counter = setInterval(function(){
		seconds -= 1;
		btn.innerText = seconds 
	}, 1000);

	setTimeout(function () {
	    btn.disabled = false;
	    clearInterval(counter);
	    btn.innerText = "Enviar verificação";
	}, 30000);

	usuarioNaoVerificado.sendEmailVerification().catch(function(error){
		alert("Erro ao enviar verificação de e-mail");
	});
}

/* Verifica se já existe algum usuário com o nome de exibição passado por parâmetro. Retorna true caso 
   o nome esteja disponível e false caso contrário. */
async function checkDisplayName(displayName){
	let disponivel = true;
	displayName = displayName.toLowerCase();
	await database.ref('users/').once('value').then(function(snapshot) {
		var data = snapshot.val();
		for (var i in data){
			if(data[i].displayName.toLowerCase() == displayName){
				if (currentUser) {
					if (currentUser.displayName.toLowerCase() != displayName) {
						disponivel = false
					}
				}else{
					disponivel = false;
				}
			}
		}
	});
	return disponivel;
}

/* Verifica já existe uma aba correspondente ao chat correpondente ao app com o id passado por parâmetro. */
function isTabOpened(appid){
	let isOpened = false;
	$(".tabs").each(function() {
	    if ($(this).attr('id').substring(4) == appid){
	    	isOpened = true;
	    }
	});
	return isOpened;
}

/* Alterna para a aba correspondente ao app com id passado por parâmetro exibindo o chat correspondente a ela
   e escondendo os outros. */
function switchTab(appid){
	if (isTabOpened(appid)) {
		let id;

		$(".tabs").each(function(){
			if ($(this).attr('id') == ("tab-" + appid)) {
				$(this).css("opacity", 1);
			}
			else{
				$(this).css("opacity", 0.5);
			}
		});

		$("#wrapper > section").each(function() {
			if (appid == "chats") {
				id = $(this).attr('id');
			}
			else{
				id = $(this).attr('id').substring(5);
			}
		    if (id == appid){
		    	$(this).show();
				$(`#textarea-${appid}`).focus();
		    }
		    else{
		    	$(this).hide();
		    }
		});
		if (appid == "chats") {
			$("#game-list-order").val("");
		}
	}	
}

/* Atualiza a lista de chats de acordo com os parâmetros. */
function updateGameList(orderBy, inverse, nrItens, pag, searchName){
	let gameListHtml = "<img src='img/loading.gif' class='loading-img' title='Carregando' alt='carregando'>";
	$("#chat-list").html(gameListHtml);

	let html;
	let gameListRef = database.ref('games').orderByChild(orderBy);

	if (orderBy == "name") {
		gameListRef = gameListRef.startAt(searchName)
                 .endAt(searchName+"\uf8ff");
	}
	else{
		if (inverse) {
			gameListRef = gameListRef.limitToFirst(nrItens * pag);
		}
		else{
			gameListRef = gameListRef.limitToLast(nrItens * pag);
		}
	}

	gameListRef.once('value', function(snapshot) {
		gameListHtml = "";
		let apps = [];

		snapshot.forEach(function(childSnapshot) {
			apps.push(childSnapshot.val());
		});

		if (orderBy == "name") {
			apps.sort((a, b) => parseFloat(a.player_count) - parseFloat(b.player_count));
		}

		apps.forEach(function(app) {
			html = `<div class="games" onclick="openChat(${app.appid})" >
						<div class="scrollable">
							<img src="${app.header_image}" class="img_game" title="${app.name}" alt="Imagem de ${app.name}">
							<p>${app.name}</p>
						</div>
						<img src="img/open.png" class="expand-img" title="Abrir chat" alt="Botão abrir chat">
					</div>`;
			if (inverse) {
				gameListHtml += html	
			}
			else{
				gameListHtml = html + gameListHtml;
			}
		});
		$("#chat-list").html(gameListHtml);
		if(pag > 1){
			$("#chat-list").scrollTop($(".games").outerHeight() * (nrItens * (pag- 1) - 1));
		}
	});
}

/* Cria uma aba correspondente ao app com o id informado caso não exista e troca para ela. */
function openChat(appid){
	if(!isTabOpened(appid)){
		let html = $("#tabs-menu").html();
		html += `<div class="tabs" id="tab-${appid}" onclick="switchTab(${appid})"></div>`;
		$("#tabs-menu").html(html);
		gameListRef = database.ref(`games/${appid}`).once('value', function(snapshot) {
			game = snapshot.val();			
			$(`#tab-${appid}`).html(game.name + `<img src="img/close.png" class="close-tab" onclick="closeChat(${appid})" title="Fechar chat" alt="Botão fechar chat.">`);

			html = $("#wrapper").html();			

			html += `<section id="chat-${game.appid}" class="game-chat">
						<section id="game-info-panel-${game.appid}" class="game-info-panel empty">
							<nav>
								<div id="info-${game.appid}">Informações</div>
								<div id="requirements-${game.appid}">Requisítos</div>
								<div id="img-${game.appid}">Imagens</div>
								<div id="video-${game.appid}">Vídeos</div>
							</nav>
							<section class='game-info scrollable'><img src="img/loading-info.gif"></section>
							<section class='game-requirements scrollable'></section>
							<section class='game-img scrollable'></section>
							<section class='game-video scrollable'></section>

						</section>
						<header class="header-game-chat" onclick="showGameInfo(${game.appid})">
							<img src="${game.header_image}" class="img_game" title="${game.name}" alt="Imagem de ${game.name}">
							<h2 class="header-text scrollable">${game.name}</h2>
							<img src="img/game-info.png" class="expand-img" id="expand-info-img-${game.appid}" title="Mostrar/Ocultar informações" alt="Botão mostrar/ocultar informações">
						</header>
						<div class="scrollable msg-area" id="msg-area-${game.appid}"></div>
						<div class="write-msg-area">
							<textarea id="textarea-${game.appid}"></textarea>
							<button class="btn-send" onclick="sendMsg(${game.appid})">Enviar</button>
						</div>
					</section>`;
			$("#wrapper").html(html);
			switchTab(appid);
			loadMsgs(game.appid);
		});
	}
	else{
		switchTab(appid);
	}
}

/* Carrega todas as mensagens já presentes no Firebase Realtime Database */
function loadMsgs(appid){
	let msgsRef = firebase.database().ref('chats/' + appid).orderByChild("time").limitToLast(50);
	msgsRef.once('value', function(snapshot) {
		if (snapshot.val()) {
			Object.keys(snapshot.val()).forEach(function(childSnapshotKey) {
				let key = childSnapshotKey;
				let msg = snapshot.val()[key];

				addMsg(key, appid, msg.userId);
				loadMsgData(key, msg);
			});
		}

		createMsgListener(game.appid);
	});
}

/* Adiciona os espaços para os dados da mensagem no html. */
function addMsg(msgId, appid, userId){
	let html;
	if (userId == currentUser.uid){
		html = `<div class="my-msg" id="${msgId}">
					<div class="my-name"><img src="img/loading-min.gif" class="sender-img"><div class="displayName"></div></div>
					<spam class="msg-hora"></spam>
					<spam class="my-msg-balloon"><div class="msg-text"></div></spam>
				</div>`;
	}
	else{
		html = `<div class="msg" id ="${msgId}">
					<div class="sender-name"><img src="img/loading-min.gif" class="sender-img"><div class="displayName"></div></div>
					<spam class="msg-balloon"><div class="msg-text"></div></spam>
					<div class="msg-hora"></div>
				</div>`;
	}
	$(`#msg-area-${appid}`).html(html + $(`#msg-area-${appid}`).html());
}

/* Carrega os dados da mensagem nos espaços adicionados na função anterior */
function loadMsgData(key, msg){
	database.ref('users/' + msg.userId).once('value').then(function(snapshot){
		let senderName = snapshot.val().displayName;
		$(`#${key} .displayName`).first().text(senderName);
		$(`#${key} .msg-text`).first().text(msg.msgText);
		let date = new Date(msg.time);
		$(`#${key} .msg-hora`).first().text(
			`${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getUTCFullYear().toString().padStart(4, "0")} - 
			${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`);

		imageRef = storage.ref().child('users/' + msg.userId + '/images/avatar.png');
		imageRef.getDownloadURL().then(function(url) {
			$(`#${key} .sender-img`).first().attr("src", url);
		}).catch(function(error) {
			$(`#${key} .sender-img`).first().attr("src", "img/default-avatar.png");
		});;
		$(`#${key} .sender-img`).first().attr("title", `Imagem de ${senderName}`);
	});
}

/* Cria um listener para atualizar e adicionar na página as mensagens adicionadas no Firebase Realtime Database
   em tempo real */
function createMsgListener(appid){
	let msgsRef = firebase.database().ref('chats/' + appid).orderByChild("time").limitToLast(1);
	let isMsg = false
	msgsRef.on('value', function(snapshot) {
		if (isMsg) {
			if (snapshot.val()) {
				Object.keys(snapshot.val()).forEach(function(childSnapshotKey) {
					let key = childSnapshotKey;
					let msg = snapshot.val()[key];
					addMsg(key, appid, msg.userId);
					loadMsgData(key, msg);
				});
			}
			isMsg = false;
		}
		else{
			isMsg = true;
		}
	});
}

/* Usado pelas funções abaixo para percorrer um json e criar um código html para cada elemento e retorná-lo */
function generateHtmlBars(itens, atribute){
	let bars = '';
	itens.forEach(function(iten){
		data = (atribute == undefined) ? iten : iten[atribute];
		bars += `<spam class="bar">${data}</spam>`;
	});
	return bars;
}

/* Preenche os dados da seção de informações sobre o game */
function fillGameInfo(gameInfo, appid){
	gameRef = database.ref('games/' + appid);

	gameRef.once('value', function(game){
		let playerCount = game.val()['player_count'];
		playerCount = generateHtmlBars([playerCount]);

		let platforms = '';

		Object.keys(gameInfo['platforms']).forEach(function(platform){
			if(gameInfo['platforms'][platform] == true){
				platforms += `<spam class="bar">${platform}</spam>`;
			}
		});

		let genres = generateHtmlBars(gameInfo['genres'], 'description');
		let categories = generateHtmlBars(gameInfo['categories'], 'description');
		let languages = '';
		let languagesList = gameInfo['supported_languages'].replace(/<[^>]*>?/gm, '').replace("*idiomas com suporte total de áudio", "").split(",");
			
		languages = generateHtmlBars(languagesList);

		let metacritic = "";
		if(gameInfo['metacritic'] != undefined){
			metacritic = `<div style="display: block">
							<a href="${gameInfo['metacritic']['url']}" target="_blank" rel="noopener noreferrer">
								Metacritic:
								<div class="bar" style="margin-left:0; width: calc(${gameInfo['metacritic']['score']} * 96% / 100);">
									${gameInfo['metacritic']['score']}
								</div>
							</a>
						</div>`;
		};

		let developers = generateHtmlBars(gameInfo['developers']);
		let publishers = generateHtmlBars(gameInfo['publishers']);

		let infoHtml = `<h3>${gameInfo['name']}</h3>
					<div>
						${gameInfo['short_description']}
					</div>
					<div>Número de Jogadores ( valores nulos foram setados como 0 ) : ${playerCount}</div>
					<div>Desenvolvedores: ${developers}</div>
					<div>Publishers: ${publishers}</div>
					${metacritic}
					<div>Gêneros: ${genres}</div>
					<div>Categorias: ${categories}</div>
					<div>Plataformas: ${platforms}</div>
					<div>Idiomas suportados (* idiomas com suporte total de áudio): ${languages}</div>
					<div class="formatted">${gameInfo['about_the_game']}</div>`;
		$(`#game-info-panel-${appid} > .game-info`).first().html(infoHtml);
	});

}

/* Preenche os dados da seção de requisitos do game */
function fillGameRequirements(gameInfo, appid){
	let platformsList = [];
	Object.keys(gameInfo['platforms']).forEach(function(platform){
		if(gameInfo['platforms'][platform] == true){
			platformsList.push(platform);
		}
	});
	let reqHtml = '<div>';
	for (var i = 0; i < platformsList.length; i++) {
		switch (platformsList[i].toLowerCase()) {
		  case 'windows':
		  	reqHtml += `<h4 class="bar">Pc</h4><div class="formatted">${gameInfo['pc_requirements']['minimum']}`;
		  	if (gameInfo['pc_requirements']['recommended'] != undefined) {
		  		reqHtml += gameInfo['pc_requirements']['recommended'];
		  	}
		  	reqHtml += '</div>';
		    break;
		  case 'mac':
		  	reqHtml += `<h4 class="bar">Mac</h4><div class="formatted">${gameInfo['mac_requirements']['minimum']}`;
		  	if (gameInfo['mac_requirements']['recommended'] != undefined) {
		  		reqHtml += gameInfo['mac_requirements']['recommended'];
		  	}
		  	reqHtml += '</div>';
		  	break;
		  case 'linux':
		  	reqHtml += `<h4 class="bar">Linux</h4><div class="formatted">${gameInfo['linux_requirements']['minimum']}`;
		  	if (gameInfo['linux_requirements']['recommended'] != undefined) {
		  		reqHtml += gameInfo['linux_requirements']['recommended'];
		  	}
		  	reqHtml += '</div>';
		    break;
		}
	}
	reqHtml += '</div>';
	$(`#game-info-panel-${appid} > .game-requirements`).first().html(reqHtml);
}

/* Preenche os dados da seção de imagens do game */
function fillGameImgs(gameInfo, appid){
	let imgHtml= ``;
	if(gameInfo['screenshots'] != undefined){
		gameInfo['screenshots'].forEach(function(img){
			imgHtml += `<a href="${img['path_full']}" target="_blank" rel="noopener noreferrer">
							<img src="${img['path_thumbnail']}" title="Imagem ${img['id']}" alt="Imagem ${img['id']}">
						</a>`
		});
		$(`#game-info-panel-${appid} > .game-img`).first().html(imgHtml);
	}
}

/* Preenche os dados da seção de videos do game */
function fillGameVideos(gameInfo, appid){
	let videoHtml = ``;
	if (gameInfo['movies'] != undefined) {
		gameInfo['movies'].forEach(function(movie){
			videoHtml += `<video controls poster="${movie['thumbnail']}" title="${movie['name']}">
							   <source src="${movie['mp4']['480']}">
							   <source src="${movie['webm']['480']}" >
							   Seu navegador não suporta a tag video.
							</video>`
		});
		$(`#game-info-panel-${appid} > .game-video`).first().html(videoHtml);
	}
}

/* Alterna entre visivel e invisivel a parte de informações do game, e caso estas informações ainda não 
   estejam preenchidas chama as funções responsáveis por preencher cada parte */
function showGameInfo(appid){

	if($(`#game-info-panel-${appid}`).css('display') == 'none'){
		$(`#game-info-panel-${appid}`).slideDown();
		$(`#expand-info-img-${appid}`).css("transform", "rotate(180deg)");
		$(`#msg-area-${appid}, #chat-${appid} .write-msg-area`).hide();

		if(($(`#game-info-panel-${appid}`).attr('class').split(' ')[1]) == 'empty'){
			let myRequest = new Request(`https://cors-anywhere.herokuapp.com/https://store.steampowered.com/api/appdetails?l=brazilian&appids=${appid}`);
			fetch(myRequest)
			.then(function(response) {
				return response.json();
			})
			.then(function(game) {
				let gameInfo = game[appid]['data'];
				$(`#game-info-panel-${appid}`).css(`background-image`, `url(${gameInfo['background']})`);

				fillGameInfo(gameInfo, appid);
				fillGameRequirements(gameInfo, appid);
				fillGameImgs(gameInfo, appid);
				fillGameVideos(gameInfo, appid);

				$(`#game-info-panel-${appid}`).removeClass("empty");
			});
		}
	}
	else{
		$(`#game-info-panel-${appid}`).slideUp();
		$(`#msg-area-${appid}, #chat-${appid} .write-msg-area`).show();
		$(`#expand-info-img-${appid}`).css("transform", "rotate(0deg)");
	}
}

/* Envia uma mensagem para o Firebase Realtime Database */
function sendMsg(appid){
	if ($(`#chat-${appid} textarea`).val() != "") {
		let msgText = $(`#chat-${appid} textarea`).val();
		let userId = currentUser.uid;
		database.ref('chats/' + appid).push().set(
			{'msgText': msgText, 'userId': userId, 'time': firebase.database.ServerValue.TIMESTAMP}
		);
		$(`#chat-${appid} textarea`).val("");

		let gameRef = database.ref(`games/${appid}`);

		gameRef.transaction(function(app) {
	    	if (app) {
	    		app.msg_count++;
	    	}
	    	return app;
	    });
	}

}

/* Remove do html o chat e a aba correspondentes ao app com o id passado por parâmetro */
function closeChat(appid){
	if(isTabOpened(appid)){
		if ($(`#chat-${appid}`).css("display") != "none"){
			switchTab("chats");
		}
		$(`#tab-${appid}`).remove();
		$(`#chat-${appid}`).remove();
		firebase.database().ref('chats/' + appid).orderByChild("time").limitToLast(1).off();
	}
}

/* Eventos realizados quando a página está completamente carregada. */
$( document ).ready(function() {

	/* Carrega lista inicial dos chats disponíveis. */
	if (currentUrl == "/index.html"){
		var inverse = false;
		var nrItens = 10;
		var pag = 1;
		var orderBy = $("#game-list-order").val();
		updateGameList(orderBy, inverse, nrItens, pag);	
	}

	/* Evento de mudança de opção de ordem da lista de chats */
	$("#wrapper").on("change", "#game-list-order",function(){
		pag = 1;
		orderBy = $("#game-list-order").val();
		updateGameList(orderBy, inverse, nrItens, pag);
	});

	/* Envento de clique no botão de inversão da ordem da lista de chats */
	$("#wrapper").on("click", "#asc-desc-btn", function(){
		inverse = !inverse;
		let rotation = 0;
		if(inverse){
			rotation = 180;
		}
		$("#asc-desc-btn").css("transform", "rotate(" + rotation + "deg)");
		pag = 1;
		updateGameList(orderBy, inverse, nrItens, pag);
	});

	/* Monitora cada tecla pressionada no campo de pequisa, caso seja enter dispara um evento de 
	   clique no botão de pesquisa. */
	$("#wrapper").on("keypress", "#search-name-input", function(e){
		if(e.keyCode == 13){
			$("#search-button").click();
		}
	});

	/* Envento de clique no botão de pesquisa por um chat. */
	$("#wrapper").on("click", "#search-button", function(){
		pag = 1;
		searchName = $("#search-name-input").val();

		if (searchName == "") {
			orderBy = $("#game-list-order").val();
			$("#chat-list").css("height", "53vh");
			$("#orderBy, #load-more-btn").show();
			$("#back-search-button").hide();
		}
		else{
			orderBy = "name";
			$("#chat-list").css("height", "60vh");
			$("#orderBy, #load-more-btn").hide();
			$("#back-search-button").show();
		}

		updateGameList(orderBy, inverse, nrItens, pag, searchName);
	});

	/* Envento de clique no botão de voltar pora todos chats após a pesquisa. */
	$("#wrapper").on("click", "#back-search-button", function(){
		$("#search-name-input").val("");
		$("#search-button").click();
	});

	/* Evento de clique no botão de carregar mais chats */
	$("#wrapper").on("click", "#load-more-btn", function(){
		pag += 1;
		updateGameList(orderBy, inverse, nrItens, pag);
	});


	/* Login e cadastro */

	/* Evento de clique no botão de login. */
    $("#login-btn").click(function(){
    	let email = $("#login-email-input").val();
		let password = $("#login-password-input").val();
		login(email, password).then(function(value) {
			if (value[0] == false) {
				$("#login-erro-msg").text(value[1]);
				$("#login-erro-msg").show();
			}
		});
    });

	/* Evento de clique no botão de cadatro. */
    $("#cadastrar-btn").click(function(){
    	let displayName = $("#cadastro-displayname-input").val();
    	let email = $("#cadastro-email-input").val();
		let password = $("#cadastro-password-input").val();
		let checkPassword = $("#cadastro-check-password-input").val();
		let termosEPolitica = $("#cadastro-termos-input").is(":checked");

		cadastro(displayName, email, password, checkPassword, termosEPolitica).then(function(value){
			if (value[0] == false) {
		 		$("#cadastro-erro-msg").text(value[1]);
		 		$("#cadastro-erro-msg").show();
		 	}
		});
    });

    /* Evento de clique no botão de logout. */
    $("#logout-btn").click(function(){
    	logout();
    });

    /* Evento de clique no botão para alterar o nome de exibição. */
    $("#change-username-btn").click(function(){
    	$("#username").prop( "disabled", false );
    	$("#username").focus();
    	$("#change-username-btn").hide();
    	$("#save-username-btn").show();
    });

    /* Evento de clique no botão de confirmar e salvar o novo nome de exibição. */
    $("#save-username-btn").click(function(){
    	username = $("#username").val();
		$("#username").val(currentUser.displayName);
    	if(username != ""){
    		checkDisplayName(username).then(function(value) {
				if(value){
					currentUser.updateProfile({displayName: username}).then(function() {
						$("#perfil-erro-msg").hide();
						database.ref('users/' + currentUser.uid).set({'displayName': username});
						$("#username").val(currentUser.displayName);
					}).catch(function(error) {
						$("#perfil-erro-msg").text("Ocorreu um erro ao atualizar seu nome de exibição.");
						$("#perfil-erro-msg").show();
					});
				}
				else{
					$("#perfil-erro-msg").text("O nome de exibição já está em uso!");
					$("#perfil-erro-msg").show();
					$("#username").css("border-color", "#0cc");
				}
			});	
		}
    	else{
    		$("#perfil-erro-msg").text("O campo não pode ser um valor vazio!");
    		$("#perfil-erro-msg").show();
			$("#username").css("border-color", "#0cc");
    	}

    	$("#username").prop( "disabled", true );
		$("#save-username-btn").hide();
		$("#change-username-btn").show();
    });

    $("#change-img").click(function(){
    	$("#profile-avatar").click();
    });

    /* Evento de mudança no input referente a foto de perfil. */
    $("#profile-avatar").change(function(event){
    	let fullPath = $("#profile-avatar").val();
		if (fullPath) {
		    let startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
		    let filename = fullPath.substring(startIndex);
		    if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
		        filename = filename.substring(1);
		    }
		    if(filename.split('.').pop() == "png"){
				if(event.target.files[0]['size'] < 2000000){
					let imageRef = storage.ref().child('users/' + currentUser.uid + '/images/avatar.png');
					let image = event.target.files[0];
					imageRef.put(image).then(function(snapshot) {
  						// console.log('Imagem enviada!');
  						$("#perfil-erro-msg").hide();
					}).then(function(){
						imageRef.getDownloadURL().then(function(url) {
							$("#profile-img").attr("src",url);
						}).catch(function(error) {
							if(error.code == 'storage/unauthorized'){
								alert("Sem autorização");
							}
						});
					}).catch(function(error){
						$("#perfil-erro-msg").text("Ocorreu um erro ao atualizar a imagem!");
						$("#perfil-erro-msg").show();
					});
					$("#profile-img").attr("src","img/loading-min.gif");
				}
				else{
					$("#perfil-erro-msg").text("A imagem deve ser menor que 2 MB!");
					$("#perfil-erro-msg").show();
				}
			}
			else{
				$("#perfil-erro-msg").text("A imagem deve estar no formato png!");
				$("#perfil-erro-msg").show();
			}
		}
    });

	/* Evento de clique no botão de excluir a imagem do perfil. */
    $("#delete-img-btn").click(function(){
		let imageRef = storage.ref().child('users/' + currentUser.uid + '/images/avatar.png');
		imageRef.delete().then(function(){
			$("#profile-img").attr("src","img/loading-min.gif");
			$("#perfil-erro-msg").hide();
			$("#profile-avatar").val(undefined);
			imageRef.getDownloadURL().then(function(url) {
				$("#profile-img").attr("src",url);
			}).catch(function(error) {
				$("#profile-img").attr("src","img/default-avatar.png");
				if(error.code == 'storage/unauthorized'){
					alert("Sem autorização");
				}
			});
		}).catch(function(error){
			console.log(error.code);
			if(error.code == "storage/object-not-found"){
				$("#perfil-erro-msg").text("Você já está sem imagem de perfil!");
			}
			else{
				$("#perfil-erro-msg").text("Ocorreu um erro ao apagar a imagem!");
			}
			$("#perfil-erro-msg").show();
		});

    });

    /* Evento de tecla pressionada nos inputs referentes ao nome de exibição. Verifica se o nome está disponível .*/
    $("#username, #cadastro-displayname-input").keyup(function(){
    	let displayName = $(this);
    	checkDisplayName(displayName.val()).then(function(value) {
    		if (value && (displayName.val() != "")) {
    			displayName.css("border-color", "#0cc");
    		}else{
    			displayName.css("border-color", "#DC143C");
    		}
    	});
    });

    /* Evento de clique no botão de alterar senha. */
    $("#reset-password").click(function(){
    	let email = currentUser.email;

    	sendResetPassword(email).then(function(value){
    		$("#perfil-erro-msg").text(value);
			$("#perfil-erro-msg").show();
    	});
    });

	/* Evento de clique no botão de senha esquecida. */
    $("#forgotten-password").click(function(){
    	let email = $("#login-email-input").val();

    	sendResetPassword(email).then(function(value){
    		$("#login-erro-msg").text(value);
			$("#login-erro-msg").show();
    	});
    });

    /* Monitora cada tecla pressionada no formulário de login, caso seja enter dispara um evento de 
	   clique no botão de login. */
    $("#login-form").keypress(function(e){
    	if(e.keyCode == 13){
    		$("#login-btn").click();
    	}
    });

    /* Monitora cada tecla pressionada no formulário de cadastro, caso seja enter dispara um evento de 
	   clique no botão de cadastro. */
    $("#cadastro-form").keypress(function(e){
    	if(e.keyCode == 13){
    		$("#cadastrar-btn").click();
    	}
    });

    /* Monitora cada tecla pressionada na área de texto usada pelo usuário para digitar uma mensagem, 
    caso seja enter envia a mensagem. */
    $("#wrapper").on("keydown", "textarea", function(e){
    	if(e.keyCode == 13){
    		let appid = $(this).attr("id").substring("textarea-".length);
    		sendMsg(appid);
    		return false;
    	}
    });

    $("#wrapper").on("click", ".game-info-panel > nav > div", function(){

    	let target = $(this).attr('id').split('-')[0];
    	let appid = $(this).attr('id').split('-')[1];
    	
    	if(($(`#game-info-panel-${appid}`).attr('class').split(' ')[1]) != 'empty'){
    		$(`#game-info-panel-${appid} section`).each(function(){
	    		if(($(this).attr('class').split(" ")[0]) == (`game-${target}`)){
	    			$(this).show();
	    		}
	    		else{
	    			$(this).hide();
	    		}
	    	})
	    	$(`#game-info-panel-${appid} > nav > *`).each(function(){
	    		$(this).css('background-color', 'rgba(200, 200, 200, 0.2)');
	    	});
	    	$(this).css('background-color', 'rgba(200, 200, 200, 0.4)');
    	}
    });
});